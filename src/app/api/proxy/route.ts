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
import { clientIp, checkRateLimit } from "@/lib/rate-limit"

// WHITELIST HEADER (fix temuan audit "open relay"): hanya header ini yang
// diteruskan ke upstream. Semua header lain dari klien (cookie, x-forwarded-*,
// host, user-agent, dsb.) dibuang supaya proxy tidak bisa dipakai menyelundup
// kredensial sesi atau memanipulasi routing hop.
const FORWARDABLE_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "x-goog-api-key",
  "anthropic-version",
  "content-type",
  "accept",
])

// Saring objek headers dari klien: ambil hanya key yang ada di whitelist
// (perbandingan lowercase), nilai non-string diabaikan.
function filterHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== "object") return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string") continue
    if (FORWARDABLE_HEADERS.has(k.toLowerCase())) out[k] = v
  }
  return out
}

// BODY CAP: tolak request body > 2 MB dengan 413. Mencegah relay dipakai
// mengirim payload raksasa yang menghabiskan bandwidth/memori fungsi.
const MAX_BODY_BYTES = 2 * 1024 * 1024

// Allowlist host penyedia AI resmi — diambil PERSIS dari baseUrl PROVIDERS di
// src/types/index.ts. Host di daftar ini adalah target normal aplikasi (BYOK).
// Catatan: Cohere di PROVIDERS memakai api.cohere.ai (bukan api.cohere.com).
const KNOWN_PROVIDER_HOSTS = new Set([
  "api.openai.com",
  "api.anthropic.com",
  "api.deepseek.com",
  "generativelanguage.googleapis.com",
  "api.mistral.ai",
  "api.groq.com",
  "api.together.xyz",
  "api.perplexity.ai",
  "api.cohere.ai",
  "api.opencode.ai",
  "opencode.ai", // OpenCode Zen: https://opencode.ai/zen/v1
])

// ALLOWLIST DENGAN FALLBACK TERDOKUMENTASI:
// Host di KNOWN_PROVIDER_HOSTS → jalur normal BYOK.
// Host DI LUAR daftar (custom baseUrl agregator, gateway OpenAI-compatible,
// Ollama/LM Studio lokal di dev) → tetap DIIZINKAN agar jalur BYOK custom
// tidak mati, TAPI hanya setelah melewati SEMUA guard existing di handler:
// same-origin, rate limit KV, SSRF assertSafeTarget (resolve DNS + blokir IP
// privat), filter header, body cap 2 MB, cap respons 10 MB, timeout upstream.
// KETERBATASAN: allowlist ketat penuh (host di luar daftar ditolak) butuh
// sinyal konfigurasi terpercaya dari klien, mis. baseUrl custom terdaftar
// saat build/deploy — roadmap Fase 2. Untuk kini, host di luar daftar hanya
// dicatat (observability) sebagai bahan menyempurnakan allowlist.
function isKnownProviderHost(url: string): boolean {
  try {
    return KNOWN_PROVIDER_HOSTS.has(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

// Loopback (127.0.0.1, localhost, ::1) is allowed in DEV: users run local LLM
// servers (Ollama, LM Studio). Validasi lewat resolve DNS (bukan cek string)
// agar IP numerik (http://2130706433/), hex, dan DNS rebinding ikut tertangani.
// Target privat lain (link-local, metadata 169.254.169.254, LAN) tetap diblokir.
// Di production loopback diblokir (SSRF ke layanan lokal self-hosted/Docker).
const ALLOW_LOOPBACK = process.env.NODE_ENV !== "production"

// Cap response size to avoid OOM from a malicious/huge upstream response.
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024 // 10 MB

// Timeout agar upstream yang macet tidak menggantung fungsi (biaya/DoS).
// 45 dtk selaras dengan timeout klien 50 dtk (LLM_TIMEOUT_MS di api.ts),
// menyisakan headroom transport; platform (Vercel) tetap memenggal sesuai
// batas durasi fungsinya sendiri (maxDuration di bawah).
const UPSTREAM_TIMEOUT_MS = 45_000

async function forward(url: string, init: RequestInit) {
  const response = await fetchValidated(
    url,
    { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
    { allowLoopback: ALLOW_LOOPBACK }
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

// Batas durasi fungsi (Next.js App Router / Vercel) — tanpa ini function
// dipenggal platform sesuai default plan, klien terima 500 tanpa penjelasan.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 })
    }
    const rl = await checkRateLimit(`proxy:${clientIp(request)}`, 60, 60_000)
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
    // METHOD RESTRICTION: hanya GET dan POST; method lain (PUT/DELETE/PATCH/
    // CONNECT/...) ditolak 405.
    if (method !== undefined && method !== "GET" && method !== "POST") {
      return NextResponse.json(
        { error: "Method tidak didukung. Gunakan GET atau POST." },
        { status: 405 }
      )
    }
    // BODY CAP: tolak body > 2 MB dengan 413.
    const bodyJson =
      method === "GET" || body === undefined ? undefined : JSON.stringify(body)
    if (bodyJson && new TextEncoder().encode(bodyJson).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Body terlalu besar (maksimal 2 MB)" }, { status: 413 })
    }
    // ALLOWLIST: host penyedia dikenal → jalur BYOK normal. Host di luar
    // daftar (BYOK custom) TETAP DIIZINKAN lewat semua guard di bawah; hanya
    // dicatat untuk evaluasi allowlist Fase 2.
    if (!isKnownProviderHost(url)) {
      try {
        console.info(`[proxy] target di luar allowlist provider: ${new URL(url).hostname}`)
      } catch {}
    }
    try {
      await assertSafeTarget(url, { allowLoopback: ALLOW_LOOPBACK })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "URL target tidak diizinkan" }, { status: 400 })
    }
    const httpMethod = method === "GET" ? "GET" : "POST"
    const { response, parsed } = await forward(url, {
      method: httpMethod,
      headers: filterHeaders(headers),
      body: bodyJson,
    })
    return respond(response, parsed)
  } catch (error: any) {
    // Sertakan kode penyebab (ECONNREFUSED/ENOTFOUND/ETIMEDOUT dsb., bukan
    // data sensitif) agar error "fetch failed" yang generik bisa didiagnosis.
    const cause = (error as any)?.cause?.code ? ` [${(error as any).cause.code}]` : ""
    // Sanitasi: jangan sampai fragmen API key (mis. dari pesan error upstream)
    // ikut terkirim ke klien.
    const msg = (String(error?.message || "Proxy gagal") + cause).replace(
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
