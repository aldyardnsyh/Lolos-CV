import { NextRequest, NextResponse } from "next/server"

// Tolerant parse: some routers append stream terminators like `data: [DONE]`
// to non-streamed bodies, producing invalid JSON. Strip known tails, then
// salvage the outermost balanced object before giving up.
//
// SSE (Server-Sent Events) streams: agregator/LLM gateways sering mengembalikan
// `data: {...}\n\ndata: {...}\n\ndata: [DONE]` bahkan untuk request non-stream.
// Gabungkan semua `data:` payload, ambil field `content` dari tiap chunk, dan
// jadikan satu string utuh.
function parseLoose(text: string): any {
  const trimmed = text.replace(/\s*data:\s*\[DONE\]\s*$/i, "").trim()

  // 1) SSE stream (multiple `data:` lines) — gabungkan delta content
  if (/^data:/.test(trimmed) || /[\r\n]data:/.test(trimmed)) {
    const chunks: string[] = []
    for (const line of trimmed.split(/\r?\n/)) {
      const m = line.match(/^data:\s*(.*)$/)
      if (!m || !m[1].trim() || m[1].trim() === "[DONE]") continue
      try {
        const parsed = JSON.parse(m[1])
        const content = parsed?.choices?.[0]?.delta?.content
          ?? parsed?.choices?.[0]?.message?.content
          ?? parsed?.content
          ?? parsed?.response
          ?? parsed?.output_text
        if (typeof content === "string") chunks.push(content)
      } catch {}
    }
    if (chunks.length > 0) {
      const joined = chunks.join("")
      try { return JSON.parse(joined) } catch {}
      return joined
    }
  }

  // 2) NDJSON: satu JSON per baris, tanpa prefix `data:`
  //    (format yang sering dipakai agregator/LLM gateway)
  if (trimmed.includes("\n")) {
    const chunks: string[] = []
    for (const line of trimmed.split(/\r?\n/)) {
      const l = line.trim()
      if (!l || l === "[DONE]") continue
      try {
        const parsed = JSON.parse(l)
        const content = parsed?.choices?.[0]?.delta?.content
          ?? parsed?.choices?.[0]?.message?.content
          ?? parsed?.content
          ?? parsed?.response
          ?? parsed?.output_text
        if (typeof content === "string") chunks.push(content)
        else if (parsed && typeof parsed === "object") chunks.push(JSON.stringify(parsed))
      } catch {
        // bukan JSON per baris — biarkan fallback di bawah
      }
    }
    if (chunks.length > 0) {
      const joined = chunks.join("")
      try { return JSON.parse(joined) } catch {}
      return joined
    }
  }

  try {
    return JSON.parse(trimmed)
  } catch {}
  const last = trimmed.lastIndexOf("}")
  if (last > 0) {
    try {
      return JSON.parse(trimmed.slice(0, last + 1))
    } catch {}
  }
  return trimmed
}

import { assertSafeTarget, fetchValidated } from "@/lib/ssrf"
import { clientIp, rateLimit } from "@/lib/rate-limit"

// Loopback (127.0.0.1, localhost, ::1) is allowed: users run local LLM
// servers (Ollama, LM Studio). Validasi lewat resolve DNS (bukan cek string)
// agar IP numerik (http://2130706433/), hex, dan DNS rebinding ikut tertangani.
// Target privat lain (link-local, metadata 169.254.169.254, LAN) tetap diblokir.

// Cap response size to avoid OOM from a malicious/huge upstream response.
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024 // 10 MB

// Timeout agar upstream yang macet tidak menggantung fungsi (biaya/DoS).
// 175 dtk selaras dengan timeout klien 180 dtk; platform (Vercel) tetap
// memenggal sesuai batas durasi fungsinya sendiri.
const UPSTREAM_TIMEOUT_MS = 175_000

async function forward(url: string, init: RequestInit) {
  const response = await fetchValidated(
    url,
    { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
    { allowLoopback: true }
  )
  const contentLength = Number(response.headers.get("content-length") || 0)
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Upstream response too large")
  }
  const data = await response.text()
  if (data.length > MAX_RESPONSE_BYTES) {
    throw new Error("Upstream response too large")
  }
  return { response, parsed: parseLoose(data) }
}

// Self-hosted open proxy abuse: only serve requests that come from the same
// origin (the app itself). Blocks external sites AND non-browser clients
// (curl/postman, tanpa Origin/Referer) from using this endpoint as a free
// CORS/SSRF relay. fetch() POST dari browser selalu mengirim header Origin,
// jadi klien sah tidak terdampak.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])

function originHostOf(value: string | null): string | null {
  if (!value) return null
  try {
    const u = new URL(value)
    return (u.port ? `${u.hostname}:${u.port}` : u.hostname).toLowerCase()
  } catch {
    return null
  }
}

function isSameOrigin(req: NextRequest): boolean {
  const host = (req.headers.get("host") || "").toLowerCase()
  const from =
    originHostOf(req.headers.get("origin")) ?? originHostOf(req.headers.get("referer"))
  if (!from) return false
  if (from === host) return true
  // dev: allow localhost variants (localhost vs 127.0.0.1, any port)
  const stripPort = (h: string) => h.replace(/:\d+$/, "")
  return LOCAL_HOSTNAMES.has(stripPort(from)) && LOCAL_HOSTNAMES.has(stripPort(host))
}

function respond(response: Response, parsed: any) {
  return new NextResponse(JSON.stringify({ status: response.status, data: parsed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 })
    }
    const rl = rateLimit(`proxy:${clientIp(request)}`, 60, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak request, coba lagi dalam ${rl.retryAfterSec} detik` },
        { status: 429 }
      )
    }
    const { url, headers, body, method } = await request.json()
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
    }
    try {
      await assertSafeTarget(url, { allowLoopback: true })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "URL target tidak diizinkan" }, { status: 400 })
    }
    const httpMethod = method === "GET" ? "GET" : "POST"
    const { response, parsed } = await forward(url, {
      method: httpMethod,
      headers,
      body: httpMethod === "GET" ? undefined : JSON.stringify(body),
    })
    return respond(response, parsed)
  } catch (error: any) {
    // Sanitasi: jangan sampai fragmen API key (mis. dari pesan error upstream)
    // ikut terkirim ke klien.
    const msg = String(error?.message || "Proxy gagal").replace(
      /(sk-(proj|svcacct|admin|org)-[A-Za-z0-9-_]+|sk-ant-[A-Za-z0-9-_]+|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9-_]+|gsk_[A-Za-z0-9_]+|pplx-[A-Za-z0-9]+|AQ\.[A-Za-z0-9-_]+)/g,
      "[redacted]"
    )
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // GET no longer needed — all proxy calls are POST (headers travel in the
  // body, not the URL) to avoid leaking auth tokens into logs/history.
  return NextResponse.json({ error: "Use POST" }, { status: 405 })
}
