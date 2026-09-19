import { NextRequest, NextResponse } from "next/server"

import { assertSafeTarget, fetchValidated } from "@/lib/ssrf"
import { clientIp, rateLimit } from "@/lib/rate-limit"

// fetch-url only fetches public job postings — no loopback/LAN targets.
// Validasi lewat resolve DNS (bukan cek string) + redirect manual tervalidasi,
// agar IP numerik, DNS rebinding, dan redirect ke IP privat ikut tertangani.

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

// Hanya frontend app sendiri yang boleh memakai endpoint ini sebagai relay.
function isSameOrigin(req: NextRequest): boolean {
  const host = (req.headers.get("host") || "").toLowerCase()
  const from =
    originHostOf(req.headers.get("origin")) ?? originHostOf(req.headers.get("referer"))
  if (!from) return false
  if (from === host) return true
  const stripPort = (h: string) => h.replace(/:\d+$/, "")
  return LOCAL_HOSTNAMES.has(stripPort(from)) && LOCAL_HOSTNAMES.has(stripPort(host))
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
}

async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" })
  } finally {
    clearTimeout(timer)
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}

function extractJsonLd(html: string): any {
  const blocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const block of blocks) {
    try {
      const jsonStr = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
      const parsed = JSON.parse(jsonStr)
      const objs = Array.isArray(parsed) ? parsed : [parsed]
      for (const obj of objs) {
        if (obj?.["@type"] === "JobPosting" || obj?.["@graph"]?.some((g: any) => g["@type"] === "JobPosting")) {
          return obj
        }
      }
    } catch {}
  }
  return null
}

function extractTitle(html: string): string {
  return (
    html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1] ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
    ""
  )
}

function extractMetaDescription(html: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase()
    const val = tag.match(/content=["']([^"']*)["']/i)?.[1]
    if ((key === "description" || key === "og:description") && val) {
      return val
    }
  }
  return ""
}

// Halaman challenge (Cloudflare dsb.) harus dibuang, bukan diadopsi sebagai konten.
function isChallengePage(text: string): boolean {
  if (!text) return false
  const t = text.slice(0, 5000).toLowerCase()
  if (/performing security verification|challenge-platform|cf-browser-verification|checking your browser|just a moment\.\.\.|verifikasi keamanan/.test(t)) {
    return true
  }
  const markers = ["cloudflare", "captcha", "verify you are", "malicious bots", "access denied", "ddos protection", "unusual activity"]
    .filter((m) => t.includes(m)).length
  return markers >= 2 || (markers >= 1 && t.length < 2500)
}

// Deteksi halaman yang hanya berisi boilerplate (cookie consent, nav, footer)
// tapi bukan isi lowongan sungguhan. Banyak situs karier SPA hanya merender
// kerangka ini di HTML awal; isi lowongan dimuat lewat JavaScript.
function isBoilerplateOnly(text: string): boolean {
  if (!text) return true
  const t = text.slice(0, 8000).toLowerCase()
  const cookieConsent = /cookie|persetujuan|privacy|kebijakan privasi|kuki/.test(t)
  const navLike = /sign in|create account|daftar|masuk|all jobs|menu|faq|keamanan|support|contact/.test(t)
  // Isi lowongan sungguhan hampir selalu punya minimal salah satu dari ini
  const hasJobDetail =
    /(responsibilit|tanggung jawab|kualifikasi|persyaratan|qualification|requirement|deskripsi pekerjaan|job description|gaji|salary|benefit|experience|pengalaman|jenjang|deadline|melamar|apply for)/i.test(t)
  // "All Jobs" / "Apply" saja belum tentu lowongan nyata
  const navOnly = navLike && !hasJobDetail
  // Text pendek + penuh cookie/nav = boilerplate
  return cookieConsent && (navOnly || t.length < 600)
}

async function fetchViaReader(url: string): Promise<{ title: string; body: string } | null> {
  try {
    // Jina Reader: render JS penuh (SPA), handle anti-bot. Header penting:
    // X-Engine: browser → paksa headless Chrome (render SPA)
    // X-Timeout: 30 → timeout render
    // X-No-Cache: true → hindari cache lama
    const res = await timedFetch(
      `https://r.jina.ai/${url}`,
      { headers: { "Accept": "text/plain", "X-Engine": "browser", "X-Timeout": "30", "X-No-Cache": "true" } },
      40_000,
    )
    if (!res.ok) return null
    const md = await res.text()
    // Jina sering balas 200 dengan badan berisi "Warning: Target URL returned error ..."
    if (/^Warning:\s*Target URL returned error/im.test(md)) return null
    const title = md.match(/^Title:\s*(.+)$/m)?.[1] || ""
    const body = md
      .replace(/^Title:.*$/m, "")
      .replace(/^URL Source:.*$/m, "")
      .replace(/^Markdown Content:\s*$/m, "")
      .trim()
    if (!body || isChallengePage(body)) return null
    return { title, body }
  } catch {
    return null
  }
}

// Banyak situs Next.js (Karir.com, Loker.id, Glints, Kalibrr) menyimpan data
// lowongan di dalam <script id="__NEXT_DATA__" type="application/json">.
// Ini adalah "data JSON mentah" yang perlu diolah, bukan ditampilkan apa adanya.
function extractNextData(html: string): any {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

// Telusuri objek apa pun secara rekursif untuk mencari kunci yang mengandung
// "job"/"vacan"/"position" yang nilainya array — pola data lowongan di __NEXT_DATA__.
function findJobArrays(data: any, depth = 0): any[] {
  if (depth > 6 || data === null || typeof data !== "object") return []
  const found: any[] = []
  for (const [key, val] of Object.entries(data)) {
    const k = key.toLowerCase()
    if (Array.isArray(val) && /(job|vacan|position|career)/.test(k) && val.length > 0) {
      // Item lowongan biasanya punya title/name + deskripsi
      const sample = val[0]
      if (sample && typeof sample === "object" && (sample.title || sample.name || sample.position || sample.jobTitle)) {
        found.push(...val)
      }
    }
    if (typeof val === "object") {
      found.push(...findJobArrays(val, depth + 1))
    }
  }
  return found
}

// Banyak situs (Talentics, dll.) menyimpan data lowongan dalam tag <script>
// BERUPA variabel JavaScript (bukan application/json). Contoh:
//   <script>job = { id: 1, title: "Engineer", description: "...", ... }</script>
// Fungsi ini menambang script tag, mencari pola `{...}` yang mengandung field
// lowongan, lalu mengembalikan teks deskripsi yang sudah diolah.
function extractJobTextFromScripts(html: string): string {
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || []
  const results: string[] = []
  for (const script of scripts) {
    // Cari JSON object di dalam script (pola: { ... title: "..." ... })
    const content = script.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim()
    // Coba parse langsung (kalau JSON valid)
    try { const d = JSON.parse(content); if (d && d.title && d.description) { results.push(formatJobRaw(d)); continue } } catch {}
    // Cari pola key: value yang mengandung field lowongan
    const titleM = content.match(/["'\`]title["'\`]\s*[=:]\s*["'\`]([^"'\`<]+)["'\`]/i)
    const descM = extractScriptString(content, "description")
    const companyM = content.match(/["'\`](?:companyName?|organizationName?|hiringOrganization)["'\`]\s*[=:]\s*["'\`]([^"'\`<]+)["'\`]/i)
    const locationM = content.match(/["'\`]location["'\`]\s*[=:]\s*["'\`]([^"'\`<]+)["'\`]/i)
    const title = titleM ? titleM[1] : ""
    const desc = descM || ""
    if (title || desc) {
      const parts = [
        title && `Posisi: ${title}`,
        companyM && `Perusahaan: ${companyM[1]}`,
        locationM && `Lokasi: ${locationM[1]}`,
        desc && `Deskripsi:\n${decodeScriptText(desc)}`,
      ].filter(Boolean).join("\n")
      if (parts) results.push(parts)
    }
  }
  return results.join("\n\n---\n\n")
}

// Ambil nilai string dari `"key": "..."` di dalam script, menangani escaped
// quotes (\") dengan benar — tidak berhenti di quote dalam string.
// Kalau ada beberapa key yang sama, ambil nilai TERPANJANG (deskripsi job
// detail hampir selalu lebih panjang dari meta/SEO description).
function extractScriptString(content: string, key: string): string {
  const re = new RegExp(`["'\`]${key}["'\`]\\s*[=:]\\s*["'\`]`, "gi")
  let best = ""
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const start = m.index + m[0].length
    const quote = m[0][m[0].length - 1]
    let out = ""
    let i = start
    for (; i < content.length; i++) {
      const ch = content[i]
      if (ch === "\\") { out += ch + (content[i + 1] || ""); i++; continue }
      if (ch === quote) break
      out += ch
    }
    if (out.length > best.length) best = out
  }
  return best
}

// Decode string escaped (JSON-style) dari script: \n, \u003C, \", dll.
function decodeScriptText(s: string): string {
  try {
    const unescaped = JSON.parse('"' + s.replace(/"/g, '\\"') + '"')
    return unescaped.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim()
  } catch {
    return s.replace(/\\n/g, "\n").replace(/<[^>]+>/g, "").trim()
  }
}

function formatJobRaw(raw: any): string {
  if (!raw || !raw.title) return ""
  const desc = String(raw.description || raw.jobDescription || raw.responsibilities || "").replace(/<[^>]+>/g, "").trim()
  const company = String(raw.company?.name || raw.companyName || raw.organization?.name || raw.hiringOrganization?.name || "").trim()
  const location = String(raw.location?.city || raw.location?.name || raw.city || "").trim()
  return [
    `Posisi: ${raw.title}`,
    company && `Perusahaan: ${company}`,
    location && `Lokasi: ${location}`,
    desc && `Deskripsi:\n${desc}`,
  ].filter(Boolean).join("\n")
}

function normalizeNextDataJob(raw: any): { title: string; company: string; location: string; description: string; url: string } | null {
  if (!raw || typeof raw !== "object") return null
  const title = String(raw.title || raw.jobTitle || raw.name || raw.position || "").trim()
  const company = String(raw.company?.name || raw.companyName || raw.organization?.name || raw.hiringOrganization?.name || "").trim()
  const location = String(
    raw.location?.city || raw.location?.name || raw.addressLocality ||
    raw.city || raw.jobLocation?.address?.addressLocality || raw.workplaceType || ""
  ).trim()
  const desc = String(raw.description || raw.jobDescription || raw.responsibilities || "").trim()
  if (!title) return null
  return { title, company, location, description: desc, url: String(raw.url || raw.link || "") }
}

// Ekstrak konten lowongan dari __NEXT_DATA__ jadi teks bersih yang bisa
// dipakai AI. Ini menyelesaikan kasus "data JSON mentah" dari situs Next.js.
function extractJobTextFromNextData(html: string): string {
  const data = extractNextData(html)
  if (!data) return ""
  const jobs = findJobArrays(data)
  if (jobs.length === 0) return ""
  const parts: string[] = []
  for (const job of jobs) {
    const n = normalizeNextDataJob(job)
    if (!n) continue
    parts.push([
      n.title && `Posisi: ${n.title}`,
      n.company && `Perusahaan: ${n.company}`,
      n.location && `Lokasi: ${n.location}`,
      n.description && `Deskripsi:\n${n.description}`,
    ].filter(Boolean).join("\n"))
  }
  return parts.join("\n\n---\n\n")
}

async function fetchViaProxyHtml(url: string): Promise<{ html: string; source: string } | null> {
  const endpoints = [
    { source: "corsproxy", url: `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
    { source: "allorigins", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  ]
  for (const ep of endpoints) {
    try {
      const res = await timedFetch(ep.url, { headers: { "Accept": "*/*" } }, 25_000)
      if (!res.ok) {
        console.warn(`[fetch-url] ${ep.source} HTTP ${res.status} for ${url}`)
        continue
      }
      const contentType = res.headers.get("content-type") || ""
      if (contentType && !/text\/html|text\/plain|application\/xhtml|text\/xml/i.test(contentType)) {
        console.warn(`[fetch-url] ${ep.source} content-type ${contentType} for ${url}`)
        continue
      }
      const html = await res.text()
      if (!html || html.length < 500 || isChallengePage(htmlToText(html))) {
        console.warn(`[fetch-url] ${ep.source} empty/challenge body (${html.length} chars) for ${url}`)
        continue
      }
      return { html, source: ep.source }
    } catch (err: any) {
      console.warn(`[fetch-url] ${ep.source} failed for ${url}: ${err?.message ?? err}`)
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 })
    }
    const rl = rateLimit(`fetch-url:${clientIp(request)}`, 20, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak request, coba lagi dalam ${rl.retryAfterSec} detik` },
        { status: 429 }
      )
    }
    const { url } = await request.json()
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    try {
      await assertSafeTarget(url)
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "URL target tidak diizinkan" }, { status: 400 })
    }

    let text = ""
    let title = ""
    let strategy = "none"
    const attempts: string[] = []

    const hasJobKeywords = (t: string) =>
      /(requirement|qualification|kualifikasi|persyaratan|responsibilit|tanggung jawab|deskripsi pekerjaan|job description|benefit|gaji|salary)/i.test(t)
    const usable = (t: string) =>
      t.trim().length >= 300 && !isChallengePage(t) && !isBoilerplateOnly(t)

    // Strategy 1: Direct fetch with full browser-like headers.
    // Redirect ditangani manual + divalidasi tiap hop (anti SSRF via redirect).
    try {
      const response = await fetchValidated(
        url,
        { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20_000) },
        {}
      )
      if (response.ok) {
        const contentType = response.headers.get("content-type") || ""
        if (/text\/html|text\/plain|application\/xhtml/i.test(contentType) || !contentType) {
          const html = await response.text()
          title = extractTitle(html)
          text = htmlToText(html)
          const jsonLd = extractJsonLd(html)
          if (jsonLd) {
            return NextResponse.json({
              text: text.slice(0, 15000),
              jsonLd,
              title,
              contentType,
              strategy: "direct-jsonld",
              blocked: false,
            })
          }
          if (isChallengePage(text)) {
            attempts.push("direct: cloudflare/bot challenge page")
            text = ""
          } else {
            strategy = "direct"
          }
          // Coba ekstrak data lowongan dari __NEXT_DATA__ (Next.js SPA)
          // sebelum lanjut ke strategi lain. Banyak situs (Glints, Karir.com,
          // Loker.id, Kalibrr) simpan data lowongan di sini.
          const nextDataText = extractJobTextFromNextData(html)
          if (nextDataText.length > text.length) {
            text = nextDataText
            strategy = "direct-nextdata"
          }
          // Coba ekstrak dari variabel JS di <script> (Talentics, dll)
          const scriptDataText = extractJobTextFromScripts(html)
          if (scriptDataText.length > text.length) {
            text = scriptDataText
            strategy = "direct-script"
          }
        } else {
          attempts.push(`direct: unsupported content-type ${contentType}`)
        }
      } else {
        attempts.push(`direct: HTTP ${response.status} ${response.statusText}`)
      }
    } catch (err: any) {
      attempts.push(`direct: ${err.name === "AbortError" ? "timeout 20s" : err.message}`)
    }

    // Strategy 2: Jina Reader — renders the page (incl. JS/SPA), sering lolos proteksi bot
    if (!usable(text) || !hasJobKeywords(text)) {
      const reader = await fetchViaReader(url)
      if (reader) {
        if (!title && reader.title) title = reader.title
        if (reader.body.length > text.length) {
          text = reader.body
          strategy = "reader"
        }
      } else {
        attempts.push("reader: blocked or unavailable")
      }
    }

    // Strategy 3: Proxy mirror HTML server-side (untuk blokir non-Cloudflare,
    // hotlink protection, geo-block). JSON-LD ikut ditambang dari hasilnya.
    if (!usable(text)) {
      const proxied = await fetchViaProxyHtml(url)
      if (proxied) {
        const jsonLd = extractJsonLd(proxied.html)
        const proxyText = htmlToText(proxied.html)
        const proxyTitle = extractTitle(proxied.html)
        if (jsonLd) {
          return NextResponse.json({
            text: proxyText.slice(0, 15000),
            jsonLd,
            title: title || proxyTitle,
            contentType: "text/html",
            strategy: `${proxied.source}-jsonld`,
            blocked: false,
          })
        }
        // Coba data dari __NEXT_DATA__ di hasil proxy juga
        const nextDataText = extractJobTextFromNextData(proxied.html)
        if (!title && proxyTitle) title = proxyTitle
        const bestText = nextDataText.length > proxyText.length ? nextDataText : proxyText
        if (bestText.length > text.length) {
          text = bestText
          strategy = nextDataText.length > proxyText.length ? `${proxied.source}-nextdata` : proxied.source
        }
      } else {
        attempts.push("proxy-mirror: blocked or unavailable")
      }
    }

    // Strategy 4: Meta description as last resort (redirect tervalidasi juga)
    if (text.length < 400) {
      try {
        const response = await fetchValidated(
          url,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15_000) },
          {}
        )
        if (response.ok) {
          const html = await response.text()
          const metaDesc = extractMetaDescription(html)
          if (metaDesc && !isChallengePage(metaDesc)) {
            const metaTitle = extractTitle(html)
            const combined = [metaTitle, metaDesc].filter(Boolean).join("\n\n")
            if (combined.length > text.length) {
              text = combined
              if (metaTitle && !title) title = metaTitle
              strategy = "meta"
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({
      text: text.slice(0, 15000),
      jsonLd: null,
      title,
      strategy,
      blocked: !usable(text),
      directError: attempts.join("; "),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
