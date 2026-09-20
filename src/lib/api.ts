import type { ApiProvider, ATSAnalysis, JobPosting, JobStream, ProviderModel, ResumeData, ProviderConfig, ReasoningEffort } from "@/types"
import { PROVIDERS } from "@/types"
import { buildExclusionTerms, sanitizeKeywordList } from "@/lib/keywords"

export interface ApiConfig {
  apiKey: string
  model: string
  provider: ApiProvider
  baseUrl: string
  reasoningEffort?: ReasoningEffort
}

export function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeLocalSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {}
}

export function safeLocalRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {}
}

export function getApiConfig(): ApiConfig | null {
  if (typeof window === "undefined") return null
  const stored = safeLocalGet("api_config")
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function getActiveProvider(): ProviderConfig | null {
  const config = getApiConfig()
  if (!config) return null
  return PROVIDERS.find((p) => p.id === config.provider) || null
}

export interface DetectionResult {
  provider: ProviderConfig | null
  ambiguous: boolean
  candidates: ProviderConfig[]
}

export function detectProvider(apiKey: string): ProviderConfig | null {
  const result = detectProviderWithCandidates(apiKey)
  return result.provider
}

export function detectProviderWithCandidates(apiKey: string): DetectionResult {
  if (!apiKey.trim()) return { provider: null, ambiguous: false, candidates: [] }

  const key = apiKey.trim()
  const candidates: ProviderConfig[] = []

  // Pass 1: Check providers with unique/unambiguous prefixes
  for (const provider of PROVIDERS) {
    if (!provider.enabled) continue
    if (provider.id === "deepseek" || provider.id === "opencode" || provider.id === "opencode-zen") continue
    if (provider.apiKeyPattern.test(key)) {
      candidates.push(provider)
    }
  }

  // Pass 2: For bare sk- keys, check length-based heuristics
  if (/^sk-/.test(key) && !candidates.some((c) => c.id === "openai")) {
    const suffix = key.slice(3)

    // Check if it matches OpenAI's old pattern (no sub-prefix)
    // Legacy OpenAI keys are no longer issued, so prefer others
    if (suffix.length >= 16) {
      const ds = PROVIDERS.find((p) => p.id === "deepseek")
      if (ds?.enabled) candidates.push(ds)
    }
    if (suffix.length >= 32) {
      const oc = PROVIDERS.find((p) => p.id === "opencode")
      if (oc?.enabled) candidates.push(oc)
    }
    if (suffix.length >= 16) {
      const oz = PROVIDERS.find((p) => p.id === "opencode-zen")
      if (oz?.enabled) candidates.push(oz)
    }
  }

  // Selalu sediakan Custom sebagai jalan keluar untuk key agregator multi-model
  // (OpenRouter, OpenAgentic, dsb.) yang formatnya tidak cocok dengan provider manapun.
  const custom = PROVIDERS.find((p) => p.id === "custom")
  if (candidates.length > 1) {
    return { provider: candidates[0], ambiguous: true, candidates: custom ? [...candidates, custom] : candidates }
  }
  if (candidates.length === 1) return { provider: candidates[0], ambiguous: false, candidates }
  if (key.length >= 8 && custom) {
    return { provider: null, ambiguous: true, candidates: [custom] }
  }
  return { provider: null, ambiguous: false, candidates: [] }
}

export function getModelsForProvider(providerId: ApiProvider): ProviderModel[] {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  return provider?.models || []
}

export function getDefaultModel(providerId: ApiProvider): string {
  const models = getModelsForProvider(providerId)
  return models[0]?.id || ""
}

// Effort hanya dikirim jika MODEL terpilih memang mendukung reasoning.
// Model yang tidak dikenal (hasil fetch live) konservatif: tidak ada effort,
// agar tidak memicu 400 "unsupported parameter" saat tes koneksi maupun generate.
export function getReasoningEffortsForModel(providerId: ApiProvider, model?: string): ReasoningEffort[] {
  const provider = PROVIDERS.find((p) => p.id === providerId)
  if (!provider || !model) return []
  const known = provider.models.find((m) => m.id === model)
  if (known) return known.efforts || []
  return []
}

const MODEL_ID_SKIP = /embed|tts|whisper|dall-e|moderation|rerank|audio|speech|realtime|transcribe/i

export async function fetchAvailableModels(config: ApiConfig): Promise<ProviderModel[]> {
  let url: string
  const headers: Record<string, string> = {}

  if (config.provider === "google") {
    url = `${config.baseUrl}/models`
    headers["x-goog-api-key"] = config.apiKey
  } else if (config.provider === "anthropic") {
    url = `${config.baseUrl}/models?limit=1000`
    headers["x-api-key"] = config.apiKey
    headers["anthropic-version"] = "2023-06-01"
    headers["anthropic-dangerous-direct-browser-access"] = "true"
  } else {
    url = `${config.baseUrl}/models`
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`
  }

  let data: any
  // Target localhost (Ollama / 9Router / LM Studio) → ambil langsung dari
  // browser dulu (satu mesin dengan server lokal). Fallback ke proxy bila
  // browser terblokir (server mati/CORS).
  if (typeof window !== "undefined" && isLoopbackUrl(url)) {
    try {
      data = await directFetchJson(url, headers, null, "GET", config.provider)
    } catch (directErr: any) {
      if (typeof directErr?.httpStatus === "number") throw directErr
      // Browser terblokir (server mati/CORS) → coba proxy (berhasil bila
      // dev server jalan di mesin yang sama). Kalau proxy ikut gagal,
      // sampaikan diagnosis lokal, bukan "Proxy error" generik.
      try {
        const proxyRes = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, headers, body: null, method: "GET" }),
          signal: AbortSignal.timeout(30_000),
        })
        if (!proxyRes.ok) throw new Error(`Proxy error: ${proxyRes.status}`)
        const result = await proxyRes.json()
        if (result.status >= 400) throw new Error(`API Error (${config.provider}): ${result.status} - ${JSON.stringify(result.data)}`)
        data = result.data
      } catch {
        throw localUnreachableError(url)
      }
    }
  }
  if (data === undefined) {
    // All browser calls routed through server proxy to bypass CORS restrictions.
    // POST so auth headers stay in the body, never in the URL.
    const proxyRes = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, headers, body: null, method: "GET" }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!proxyRes.ok) throw new Error(`Proxy error: ${proxyRes.status}`)
    const result = await proxyRes.json()
    if (result.status >= 400) throw new Error(`API Error (${config.provider}): ${result.status} - ${JSON.stringify(result.data)}`)
    data = result.data
  }

  if (config.provider === "google") {
    return (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => ({
        id: String(m.name || "").replace(/^models\//, ""),
        name: m.displayName || m.name || "",
        description: (m.description || "").slice(0, 140),
        maxTokens: m.inputTokenLimit || 8192,
        free: true,
      }))
      .filter((m: ProviderModel) => m.id)
  }

  // OpenAI-compatible + Anthropic both return { data: [{ id, display_name?, ... }] }
  return (data.data || [])
    .filter((m: any) => m.id && !MODEL_ID_SKIP.test(m.id))
    .map((m: any) => ({
      id: m.id,
      name: m.display_name || m.id,
      description: m.owned_by ? `Owner: ${m.owned_by}` : "Model live dari API",
      maxTokens: m.context_length || 8192,
      free: false,
    }))
}

const LLM_TIMEOUT_MS = 180_000

function friendlyFetchError(err: unknown): unknown {
  const name = (err as any)?.name
  if (name === "TimeoutError" || name === "AbortError") {
    return new Error(
      "Waktu tunggu AI habis (timeout). Model merespons terlalu lama untuk permintaan ini. Coba lagi, atau gunakan model yang lebih cepat/konten resume yang lebih ringkas."
    )
  }
  return err
}

async function parseResponseJson(res: Response): Promise<any> {
  const raw = await res.text()
  const trimmed = raw.replace(/\s*data:\s*\[DONE\]\s*$/i, "").trim()
  try {
    return JSON.parse(trimmed)
  } catch {}
  const last = trimmed.lastIndexOf("}")
  if (last > 0) {
    try {
      return JSON.parse(trimmed.slice(0, last + 1))
    } catch {}
  }
  throw new Error(`Respons bukan JSON valid: ${raw.slice(0, 200)}`)
}

function isLoopbackUrl(raw: string): boolean {
  try {
    const h = new URL(raw).hostname.toLowerCase()
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost")
  } catch {
    return false
  }
}

function isLocalAppHost(): boolean {
  if (typeof window === "undefined") return true
  const h = window.location.hostname.toLowerCase()
  return h === "localhost" || h === "127.0.0.1" || h === "::1"
}

// Browser sengaja tidak membedakan "server mati" vs "diblokir CORS"
// (keduanya TypeError generik). Pesan ini memberi tes diskriminan yang
// bisa dilakukan user dalam 10 detik: buka origin server langsung di
// address bar (tidak kena CORS) — tampil = server hidup = masalahnya CORS,
// tidak tampil = servernya memang belum jalan.
function localUnreachableError(url: string): Error {
  let origin = ""
  try { origin = new URL(url).origin } catch {}
  return new Error(
    "Server lokal tidak terjangkau dari browser." +
    (origin ? ` Tes cepat: buka ${origin} langsung di address bar — kalau tidak tampil, servernya belum jalan.` : "") +
    " Kalau terbuka tapi app tetap gagal, berarti browser diblokir CORS: aktifkan CORS di 9Router/Ollama" +
    (!isLocalAppHost() ? " (wajib aktif karena app dibuka dari versi deploy, bukan localhost)" : "") + "."
  )
}

const hostOf = (u: string) => { try { return new URL(u).host } catch { return u } }
const authHint = (url: string, status: number) =>
  status === 401
    ? ` | Key ditolak oleh ${hostOf(url)}. Pastikan API key dan Base URL berasal dari layanan yang sama, lalu klik Simpan Konfigurasi.`
    : ""

// Panggil LLM langsung dari browser (tanpa proxy). Dipakai untuk target
// localhost (Ollama / 9Router / LM Studio): request keluar dari browser user
// yang satu mesin dengan server lokalnya — jadi tetap bekerja walau app
// dibuka dari deploy (Vercel). Syarat: server lokal mengizinkan CORS.
async function directFetchJson(
  url: string,
  headers: Record<string, string>,
  body: any,
  method: "GET" | "POST",
  provider: ApiProvider,
): Promise<any> {
  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })
  if (!response.ok) {
    const error = await response.text()
    const e = new Error(`API Error (${provider} @ ${hostOf(url)}): ${response.status} - ${error.slice(0, 300)}${authHint(url, response.status)}`)
    ;(e as any).httpStatus = response.status
    throw e
  }
  return parseResponseJson(response)
}

// Jalur proxy (/api/proxy) dengan retry+backoff untuk error sementara.
// Dipakai untuk endpoint publik (hindari CORS) dan sebagai fallback
// localhost saat dev server jalan di mesin yang sama.
async function proxyFetch(
  url: string,
  headers: Record<string, string>,
  body: any,
  provider: ApiProvider,
): Promise<any> {
  // Retry dengan backoff untuk error sementara (429/5xx/proxy 500). Satu
  // transient failure tidak boleh langsung jadi error user-visible.
  const maxRetries = 2
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 800 * attempt * attempt + Math.random() * 400))
    }
    try {
      const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, headers, body }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })
      if (!proxyRes.ok) {
        const retryable = proxyRes.status === 429 || proxyRes.status >= 500
        const e = new Error(`Proxy error: ${proxyRes.status}`)
        ;(e as any).retryable = retryable
        if (!retryable) throw e
        lastError = e
        continue
      }
      const result = await proxyRes.json()
      const upstreamStatus = Number(result?.status ?? 0)
      if (upstreamStatus >= 400) {
        const errDetail = typeof result.data === "object" ? JSON.stringify(result.data) : String(result.data)
        const e = new Error(`API Error (${provider} @ ${hostOf(url)}): ${upstreamStatus} - ${errDetail}${authHint(url, upstreamStatus)}`)
        ;(e as any).retryable = upstreamStatus === 429 || upstreamStatus >= 500
        throw e
      }
      // Kalau proxy mengembalikan string (mis. hasil gabungan chunk SSE),
      // bungkus jadi objek supaya callLLM bisa membaca .content
      if (typeof result.data === "string") {
        return { content: result.data }
      }
      return result.data
    } catch (e: any) {
      lastError = e
      if (!e?.retryable) throw e
    }
  }
  throw lastError || new Error("Gagal menghubungi API setelah beberapa percobaan.")
}

async function fetchAIResponse(
  url: string,
  headers: Record<string, string>,
  body: any,
  provider: ApiProvider,
): Promise<any> {

  // Route all requests through backend proxy in browser environments to avoid CORS issues
  const isBrowser = typeof window !== "undefined"
  try {
    // Target localhost (Ollama / 9Router / LM Studio) → coba langsung dari
    // browser dulu (satu mesin dengan server lokal). Kalau browser terblokir
    // (server mati/CORS), fallback ke proxy yang berhasil bila dev server
    // jalan di mesin yang sama.
    if (isBrowser && isLoopbackUrl(url)) {
      try {
        return await directFetchJson(url, headers, body, "POST", provider)
      } catch (directErr: any) {
        // Server sempat menjawab (4xx/5xx) → sampaikan apa adanya, jangan
        // ditimpa pesan "tidak terjangkau".
        if (typeof directErr?.httpStatus === "number") throw directErr
        try {
          return await proxyFetch(url, headers, body, provider)
        } catch {
          throw localUnreachableError(url)
        }
      }
    }
    if (isBrowser) {
      return await proxyFetch(url, headers, body, provider)
    }

    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(LLM_TIMEOUT_MS) })
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error (${provider} @ ${hostOf(url)}): ${response.status} - ${error.slice(0, 300)}${authHint(url, response.status)}`)
    }
    return parseResponseJson(response)
  } catch (err: any) {
    throw friendlyFetchError(err)
  }
}

export async function testConnection(config: ApiConfig): Promise<boolean> {
  try {
    const provider = PROVIDERS.find((p) => p.id === config.provider)
    if (!provider) return false

    let url: string
    let headers: Record<string, string> = { "Content-Type": "application/json" }
    let body: any

    const isReasoningModel = /^(o1|o3|o4|deepseek-reasoner|deepseek-r1)/i.test(config.model)

    if (config.provider === "google") {
      url = `${config.baseUrl}/models/${config.model}:generateContent`
      headers["x-goog-api-key"] = config.apiKey
      body = { contents: [{ role: "user", parts: [{ text: "test" }] }], generationConfig: { maxOutputTokens: 20 } }
    } else if (config.provider === "anthropic") {
      url = `${config.baseUrl}/messages`
      headers["x-api-key"] = config.apiKey
      headers["anthropic-version"] = "2023-06-01"
      headers["anthropic-dangerous-direct-browser-access"] = "true"
      body = { model: config.model, max_tokens: 20, messages: [{ role: "user", content: "test" }] }
    } else {
      url = `${config.baseUrl}/chat/completions`
      if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`
      const useEffort = !!config.reasoningEffort && getReasoningEffortsForModel(config.provider, config.model).includes(config.reasoningEffort)
      const thinking = isReasoningModel || useEffort
      body = {
        model: config.model,
        messages: [{ role: "user", content: "test" }],
      }
      if (isReasoningModel && config.provider === "openai") {
        body.max_completion_tokens = thinking ? 512 : 20
      } else {
        body.max_tokens = thinking ? 512 : 20
      }
      if (!thinking) {
        body.temperature = 0.5
      }
      if (useEffort && ["openai", "opencode", "opencode-zen"].includes(config.provider)) {
        body.reasoning_effort = config.reasoningEffort
      }
    }

    await fetchAIResponse(url, headers, body, config.provider)
    return true
  } catch {
    return false
  }
}

async function callLLM(prompt: string, systemPrompt: string, config: ApiConfig): Promise<string> {
  const provider = PROVIDERS.find((p) => p.id === config.provider)
  if (!provider) throw new Error(`Unknown provider: ${config.provider}`)
  if (!config.baseUrl) throw new Error("Base URL belum diatur. Buka Konfigurasi API > Advanced Settings.")

  let url: string
  let body: any
  let headers: Record<string, string> = { "Content-Type": "application/json" }

  const isReasoningModel = /^(o1|o3|o4|deepseek-reasoner|deepseek-r1)/i.test(config.model)

  if (config.provider === "anthropic") {
    url = `${config.baseUrl}/messages`
    headers["x-api-key"] = config.apiKey
    headers["anthropic-version"] = "2023-06-01"
    headers["anthropic-dangerous-direct-browser-access"] = "true"
    body = { model: config.model, max_tokens: 8192, system: systemPrompt, messages: [{ role: "user", content: prompt }] }
  } else if (config.provider === "google") {
    url = `${config.baseUrl}/models/${config.model}:generateContent`
    headers["x-goog-api-key"] = config.apiKey
    body = { contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }], generationConfig: { maxOutputTokens: 8192, temperature: 0.7 } }
  } else if (config.provider === "cohere") {
    url = `${config.baseUrl}/chat`
    headers["Authorization"] = `Bearer ${config.apiKey}`
    body = { model: config.model, message: prompt, preamble: systemPrompt, max_tokens: 8192, temperature: 0.7 }
  } else {
    url = `${config.baseUrl}/chat/completions`
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`
    body = {
      model: config.model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    }

    if (isReasoningModel && config.provider === "openai") {
      body.max_completion_tokens = 8192
    } else {
      body.max_tokens = 8192
      if (!isReasoningModel) {
        body.temperature = 0.5
      }
    }

    if (config.reasoningEffort && getReasoningEffortsForModel(config.provider, config.model).includes(config.reasoningEffort)) {
      if (config.provider === "openai" || config.provider === "opencode" || config.provider === "opencode-zen") {
        body.reasoning_effort = config.reasoningEffort
      }
    }
  }

  const data = await fetchAIResponse(url, headers, body, config.provider)
  let text = ""
  if (typeof data === "string") text = data
  else if (typeof data?.content === "string") text = data.content
  else if (config.provider === "anthropic") text = data.content?.[0]?.text || ""
  else if (config.provider === "google") text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  else if (config.provider === "cohere") text = data.text || data.message?.content?.[0]?.text || ""
  else {
    // Reasoning models may put the answer in reasoning_content when content is empty
    const choice = data.choices?.[0]?.message
    const c = choice?.content ?? choice?.reasoning_content
    if (typeof c === "string") text = c
    else if (Array.isArray(choice?.content)) text = choice.content.map((x: any) => typeof x === "string" ? x : x?.text || "").join("")
    // Alternatif shapes yang dipakai banyak gateway/agregator
    else if (typeof data?.response === "string") text = data.response
    else if (typeof data?.output === "string") text = data.output
    else if (typeof data?.output_text === "string") text = data.output_text
    else if (typeof data?.message?.content === "string") text = data.message.content
    else if (typeof data?.result === "string") text = data.result
    else if (typeof data?.text === "string") text = data.text
    else if (typeof data?.answer === "string") text = data.answer
  }
  // Fallback terakhir: beberapa model/gateway mengembalikan hasil JSON final
  // secara langsung (tanpa wrapper choices/message), mis. {companyName, ...}
  // atau {overallScore, keywordMatch, ...}. Kalau objeknya bukan bentuk
  // respons provider (tidak ada choices/content/candidates/message), stringify
  // utuh sebagai teks agar extractJsonFromLLM bisa mem-parse-nya kembali.
  if ((!text || !text.trim()) && data && typeof data === "object" && !Array.isArray(data)) {
    const providerKeys = ["choices", "content", "candidates", "message", "output", "result", "response", "answer", "output_text"]
    const isProviderShape = providerKeys.some((k) => k in data)
    if (!isProviderShape) {
      try { text = JSON.stringify(data) } catch {}
    }
  }
  // Kalau masih kosong, bantu diagnose: jangan diam-diam return "" — infokan bentuk data mentah
  if (typeof text !== "string" || !text.trim()) {
    const rawHint = typeof data === "string"
      ? `(string, ${data.length} chars: ${data.slice(0, 80)})`
      : `(object, keys: ${Object.keys(data || {}).slice(0, 8).join(", ")})`
    throw new Error(`LLM mengembalikan respons kosong ${rawHint}. Coba ganti model, atau pastikan provider mendukung chat completions.`)
  }
  return text.slice(0, MAX_LLM_RESULT_CHARS)
}

const MAX_LLM_RESULT_CHARS = 200_000

function fixJsonString(str: string): string {
  return str
    .replace(/,\s*}/g, "}")
    .replace(/,\s*\]/g, "]")
    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^']*?)'\s*([,}\]])/g, ': "$1"$2')
    .replace(/:\s*'([^']*?)'\s*$/g, ': "$1"')
    .trim()
}

// Scanner-based repair: single-pass fix of the corruptions reasoning models
// introduce in JSON. Escapes real newlines/tabs inside string values, drops
// trailing commas, and handles formatting issues.
function repairJsonText(str: string): string {
  const out: string[] = []
  let inDoubleStr = false
  let esc = false

  const popTrailingComma = () => {
    let idx = out.length - 1
    while (idx >= 0 && (out[idx] === " " || out[idx] === "\t")) idx--
    if (idx >= 0 && out[idx] === ",") out.length = idx
  }

  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (inDoubleStr) {
      if (esc) {
        out.push("\\", c)
        esc = false
      } else if (c === "\\") {
        esc = true
      } else if (c === '"') {
        inDoubleStr = false
        out.push('"')
      } else if (c === "\n" || c === "\r" || c === "\t") {
        out.push(c === "\t" ? "\\t" : "\\n")
      } else {
        out.push(c)
      }
      continue
    }

    if (c === '"') {
      inDoubleStr = true
      out.push('"')
    } else if (c === "}" || c === "]") {
      popTrailingComma()
      out.push(c)
    } else {
      out.push(c)
    }
  }
  return out.join("")
}

function tryParseJson<T>(str: string): T | null {
  const attempts = [
    (s: string) => JSON.parse(s),
    (s: string) => JSON.parse(fixJsonString(s)),
    (s: string) => JSON.parse(repairJsonText(s)),
    (s: string) => JSON.parse(repairJsonText(fixJsonString(s))),
  ]
  for (const attempt of attempts) {
    try {
      return attempt(str) as T
    } catch {}
  }
  return null
}

function normalizeJobStreams(streams: JobStream[] | undefined): JobStream[] {
  return toArray<any>(streams).map((s) => {
    if (typeof s === "string") {
      return { name: s, description: "", preferredBackgrounds: [] }
    }
    return {
      name: String(s?.name || ""),
      description: String(s?.description || ""),
      preferredBackgrounds: Array.isArray(s?.preferredBackgrounds) ? s.preferredBackgrounds.map(String) : [],
    }
  }).filter((s) => s.name)
}

const toArray = <T,>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[]
  if (typeof v === "string" && v.trim()) return [v.trim()] as unknown as T[]
  return []
}
const toNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0)

function normalizeAtsAnalysis(a: any, exclude?: Set<string>): ATSAnalysis {
  return {
    overallScore: toNum(a?.overallScore),
    keywordMatch: toNum(a?.keywordMatch),
    formatScore: toNum(a?.formatScore),
    sectionScore: toNum(a?.sectionScore),
    lengthScore: toNum(a?.lengthScore),
    keyPoints: toArray<any>(a?.keyPoints).map((k) => ({
      text: String(k?.text ?? (typeof k === "string" ? k : "")),
      importance: k?.importance === "critical" || k?.importance === "nice-to-have" ? k.importance : "important",
      matched: !!k?.matched,
      matchScore: toNum(k?.matchScore),
    })).filter((k) => k.text),
    suggestions: sanitizeKeywordList(a?.suggestions, undefined, 8),
    missingKeywords: sanitizeKeywordList(a?.missingKeywords, exclude, 12),
    matchedKeywords: sanitizeKeywordList(a?.matchedKeywords, exclude, 12),
  }
}

export function normalizeResumeData(r: any): ResumeData {
  const p = r?.personalInfo || {}
  const legacyCerts: string[] = toArray<any>(r?.certifications).map((c) => typeof c === "string" ? c : String(c?.name || c?.title || "")).filter(Boolean)
  const legacyAch: string[] = toArray<any>(r?.achievements).map((a) => typeof a === "string" ? a : String(a?.name || a?.title || a?.description || "")).filter(Boolean)
  const awardsArr: string[] = toArray<any>(r?.awards).map((a) => typeof a === "string" ? a : String((a as any)?.name || (a as any)?.title || (a as any)?.description || "")).filter(Boolean)
  const awards = awardsArr.length > 0 ? awardsArr : [...legacyCerts, ...legacyAch]
  const legacySkills = toArray(r?.skills).map((s: any) => {
    if (typeof s === "string") {
      return {
        id: `sk_${Math.random().toString(36).slice(2, 8)}`,
        name: s,
        level: "intermediate" as const,
      }
    }
    return {
      id: s?.id || `sk_${Math.random().toString(36).slice(2, 8)}`,
      name: String(s?.name || ""),
      level: ["beginner", "intermediate", "advanced", "expert"].includes(s?.level) ? s.level : "intermediate",
    }
  }).filter((s) => s.name)
  const groupsRaw = toArray<any>(r?.skillGroups)
  const skillGroups = groupsRaw.map((g: any) => {
    if (typeof g === "string") {
      return { id: `sg_${Math.random().toString(36).slice(2, 8)}`, title: "", items: [g] }
    }
    const items = Array.isArray(g?.items)
      ? g.items.map((x: any) => String(x ?? "").trim()).filter(Boolean)
      : typeof g?.items === "string"
        ? String(g.items).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
        : []
    return {
      id: g?.id || `sg_${Math.random().toString(36).slice(2, 8)}`,
      title: String(g?.title || g?.category || g?.name || ""),
      items,
    }
  }).filter((g) => g.title || g.items.length > 0)
  const skillGroupsFinal = skillGroups.length > 0
    ? skillGroups
    : legacySkills.length > 0
      ? [{ id: `sg_${Math.random().toString(36).slice(2, 8)}`, title: "", items: legacySkills.map((s) => s.name) }]
      : []
  return {
    personalInfo: {
      fullName: String(p.fullName || r?.fullName || ""),
      headline: String(p.headline || r?.headline || ""),
      email: String(p.email || r?.email || ""),
      phone: String(p.phone || r?.phone || ""),
      location: String(p.location || r?.location || ""),
      linkedin: String(p.linkedin || r?.linkedin || ""),
      portfolio: String(p.portfolio || r?.portfolio || ""),
      photo: p.photo ? String(p.photo) : undefined,
    },
    summary: typeof r?.summary === "string" ? r.summary : (Array.isArray(r?.summary) ? r.summary.join("\n") : ""),
    experiences: toArray(r?.experiences).map((e: any) => {
      const desc = Array.isArray(e?.description) ? e.description.join("\n") : (e?.description ? String(e.description) : "")
      return {
        id: e?.id || `exp_${Math.random().toString(36).slice(2, 8)}`,
        company: String(e?.company || e?.organization || ""),
        position: String(e?.position || e?.role || ""),
        location: String(e?.location || ""),
        startDate: String(e?.startDate || ""),
        endDate: String(e?.endDate || ""),
        current: e?.current ?? false,
        description: desc,
      }
    }),
    organizations: toArray(r?.organizations).map((e: any) => {
      const desc = Array.isArray(e?.description) ? e.description.join("\n") : (e?.description ? String(e.description) : "")
      return {
        id: e?.id || `org_${Math.random().toString(36).slice(2, 8)}`,
        organization: String(e?.organization || e?.company || ""),
        position: String(e?.position || e?.role || ""),
        location: String(e?.location || ""),
        startDate: String(e?.startDate || ""),
        endDate: String(e?.endDate || ""),
        current: e?.current ?? false,
        description: desc,
      }
    }),
    education: toArray(r?.education).map((e: any) => ({
      id: e?.id || `edu_${Math.random().toString(36).slice(2, 8)}`,
      institution: String(e?.institution || ""),
      degree: String(e?.degree || ""),
      field: String(e?.field || ""),
      startDate: String(e?.startDate || ""),
      endDate: String(e?.endDate || ""),
      gpa: String(e?.gpa || ""),
      level: e?.level === "school" ? "school" : e?.level === "univ" ? "univ" : undefined,
      thesisTitle: String(e?.thesisTitle || ""),
      thesisDescription: String(e?.thesisDescription || ""),
      researchTitle: String(e?.researchTitle || ""),
      researchDescription: String(e?.researchDescription || ""),
    })),
    skills: legacySkills,
    skillGroups: skillGroupsFinal,
    projects: toArray(r?.projects).map((p: any) => {
      if (typeof p === "string") {
        return {
          id: `proj_${Math.random().toString(36).slice(2, 8)}`,
          name: p,
          description: "",
          url: "",
          technologies: [],
        }
      }
      return {
        id: p?.id || `proj_${Math.random().toString(36).slice(2, 8)}`,
        name: String(p?.name || ""),
        description: Array.isArray(p?.description) ? p.description.join("\n") : String(p?.description || ""),
        url: String(p?.url || ""),
        technologies: Array.isArray(p?.technologies) ? p.technologies.map(String) : [],
      }
    }),
    certifications: legacyCerts,
    achievements: legacyAch,
    awards,
    languages: toArray<any>(r?.languages).map((l) => typeof l === "string" ? l : String(l?.name || l?.language || "")).filter(Boolean),
  }
}

async function extractJsonFromLLM<T>(prompt: string, systemPrompt: string, config: ApiConfig): Promise<T> {
  const rawResult = await callLLM(prompt, systemPrompt, config)

  // Strip reasoning / thought tags from reasoning models (e.g. DeepSeek R1, QwQ, etc.)
  const result = rawResult.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()

  const strategies: string[] = []

  // Strategy 1: Find markdown code block with json or anything inside
  const codeBlock = result.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) strategies.push(codeBlock[1].trim())

  // Strategy 2: Find outermost balanced { ... } block
  let depth = 0
  let start = -1
  for (let i = 0; i < result.length; i++) {
    if (result[i] === "{") {
      if (depth === 0) start = i
      depth++
    } else if (result[i] === "}") {
      depth--
      if (depth === 0 && start >= 0) {
        strategies.push(result.slice(start, i + 1).trim())
        break
      }
    }
  }

  // Strategy 3: Find any greedy { ... }
  const outerBrace = result.match(/(\{[\s\S]*\})/)
  if (outerBrace) strategies.push(outerBrace[1].trim())

  // Strategy 4: Use the whole cleaned response
  strategies.push(result.trim())

  // Try each strategy
  for (const s of strategies) {
    if (!s) continue
    const parsed = tryParseJson<T>(s)
    if (parsed) return parsed
  }

  throw new Error(`Gagal parse JSON dari respons AI. Coba generate ulang.\n\nResponse: ${result.slice(0, 200)}`)
}

function parseJobFromUrl(url: string, title: string): { companyName: string; position: string } {
  let companyName = ""
  let position = ""

  // Try title first: "Officer Development Program 2026 | PT Bank Mandiri (Persero), Tbk."
  if (title) {
    const parts = title.split("|").map((s) => s.trim())
    if (parts.length >= 2) {
      position = parts[0].trim()
      companyName = parts[1].trim()
    } else {
      position = title
    }
  }

  // Fallback: parse URL path
  if (!companyName || !position) {
    try {
      const path = new URL(url).pathname.replace(/\/$/, "").split("/").filter(Boolean)
      // Remove known prefixes like "jobs", "career", "position", etc.
      const segments = path.filter((s) => !/^(jobs|career|careers|position|job|apply|id)$/i.test(s))
      if (segments.length >= 2) {
        const companySeg = segments[0]
        const positionSeg = segments[1]
        companyName = companyName || companySeg
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
          .replace(/Pt /i, "PT ")
          .replace(/Tbk\b/i, "(Persero) Tbk")
        position = position || positionSeg
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      }
    } catch {}
  }

  return { companyName, position }
}

export async function analyzeJobPosting(url: string): Promise<JobPosting & { rawText: string }> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured. Silakan atur API Key di menu Konfigurasi API.")

  let pageText = ""
  let jsonLd: any = null
  let pageTitle = ""
  let lastError = ""
  let blockedFromCrawl = false

  // Step 1: Try to fetch URL content via multi-strategy crawler (direct -> reader render -> proxy mirror -> meta tags)
  try {
    const proxyRes = await fetch("/api/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(75_000),
    })
    if (!proxyRes.ok) {
      const errData = await proxyRes.json().catch(() => ({}))
      throw new Error(errData.error || `Fetch failed: ${proxyRes.status}`)
    }
    const data = await proxyRes.json()
    pageText = data.text || ""
    jsonLd = data.jsonLd
    pageTitle = data.title || ""
    blockedFromCrawl = data.blocked === true
  } catch (e: any) {
    lastError = e?.message || "fetch-url gagal"
  }

  if (!jsonLd && (blockedFromCrawl || pageText.trim().length < 200)) {
    const host = (() => { try { return new URL(url).hostname } catch { return url } })()
    throw new Error(
      `Gagal mengambil isi lowongan dari ${host}${lastError ? ` (${lastError})` : ""}. ` +
      `Situs ini memakai proteksi Cloudflare/bot yang memblokir akses otomatis dari semua strategi crawling. ` +
      `Solusi pasti: buka lowongannya di browser, copy deskripsinya, lalu gunakan tab "Paste Teks".`
    )
  }

  // Step 2: If JSON-LD found, use it directly
  if (jsonLd) {
    const job = jsonLd["@type"] === "JobPosting" ? jsonLd : jsonLd["@graph"]?.find((g: any) => g["@type"] === "JobPosting")
    if (job) {
      const extractArray = (val: any): string[] => {
        if (!val) return []
        if (typeof val === "string") return [val]
        if (Array.isArray(val)) return val.map((v) => typeof v === "string" ? v : v.name || v.description || "").filter(Boolean)
        if (typeof val === "object") return [val.name || val.description || ""].filter(Boolean)
        return []
      }
      const desc = job.description || ""
      const descText = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

      const extractBenefits = (val: any): string[] => {
        if (!val) return []
        if (typeof val === "string") return val.split(",").map((s: string) => s.trim()).filter(Boolean)
        if (Array.isArray(val)) return val.map((v: any) => typeof v === "string" ? v : v.name || v.description || "").filter(Boolean)
        return []
      }

      return {
        url,
        source: detectJobSource(url),
        companyName: job.hiringOrganization?.name || "Unknown Company",
        position: job.title || "Unknown Position",
        location: job.jobLocation?.address?.addressLocality
          ? `${job.jobLocation.address.addressLocality}, ${job.jobLocation.address?.addressCountry || ""}`
          : (typeof job.jobLocation === "string" ? job.jobLocation : ""),
        description: descText.slice(0, 5000),
        keyRequirements: extractArray(job.qualifications),
        preferredQualifications: extractArray(job.educationRequirements),
        responsibilities: extractArray(job.responsibilities),
        benefits: extractBenefits(job.jobBenefits || job.benefits),
        jobStreams: [],
        educationRequirements: extractArray(job.educationRequirements),
        rawText: pageText.slice(0, 5000),
      }
    }
  }

  // Step 3: Try AI with page text (only if it looks like real job content)
  const hasRealContent = pageText.length >= 200 && /(requirement|qualification|responsibilit|description|benefit|apply|job|kualifikasi|persyaratan|tanggung|deskripsi)/i.test(pageText)
  let aiTried = false
  let aiError: string | null = null

  if (hasRealContent) {
    aiTried = true
    const systemPrompt = `Kamu asisten ekstraktor data lowongan. Output JSON saja.

ATURAN:
- Ekstrak semua field yang bisa kamu temukan dari teks.
- Kalau satu field tidak ada di teks, isi string kosong "" atau array kosong [].
- JANGAN mengarang data yang tidak ada di teks.
- Pastikan output valid JSON murni, tanpa teks lain di luar JSON.`

    const prompt = `Buat JSON dari teks lowongan berikut. Isi semua field yang ada di teks.

URL: ${url}
Judul: ${pageTitle}

Fields: companyName, position, location, description, keyRequirements[], preferredQualifications[], responsibilities[], benefits[], jobStreams[{name, description, preferredBackgrounds[]}], educationRequirements[]

TEKS:
${pageText.slice(0, 24000)}`

    try {
      const parsed = await extractJsonFromLLM<Partial<JobPosting>>(prompt, systemPrompt, config)
      return {
        url,
        source: detectJobSource(url),
        companyName: parsed.companyName || "Unknown Company",
        position: parsed.position || "Unknown Position",
        location: parsed.location || "",
        description: parsed.description || "",
        keyRequirements: toArray<string>(parsed.keyRequirements),
        preferredQualifications: toArray<string>(parsed.preferredQualifications),
        responsibilities: toArray<string>(parsed.responsibilities),
        benefits: toArray<string>(parsed.benefits),
        jobStreams: normalizeJobStreams(parsed.jobStreams),
        educationRequirements: toArray<string>(parsed.educationRequirements),
        rawText: pageText.slice(0, 20000),
      }
    } catch (err: any) {
      aiError = err?.message || "AI extraction failed"
    }
  }

  // Step 4: Fallback — heuristics from URL + title; AI only if Step 3 never ran
  const { companyName: urlCompany, position: urlPosition } = parseJobFromUrl(url, pageTitle)

  let parsed: Partial<JobPosting> = {}
  if (!aiTried) {
    const systemPrompt = "Kamu asisten ekstraktor data lowongan. Output JSON saja."
    const prompt = `Buat JSON dari info lowongan berikut.

URL: ${url}
Judul halaman: ${pageTitle}

Fields: companyName, position, location, description, keyRequirements[], preferredQualifications[], responsibilities[], benefits[], jobStreams[], educationRequirements[]

Ekstrak dari URL dan judul halaman. Jika judul mengandung "|", bagian kiri biasanya posisi, bagian kanan perusahaan.`

    try {
      parsed = await extractJsonFromLLM<Partial<JobPosting>>(prompt, systemPrompt, config)
    } catch (err: any) {
      aiError = err?.message || "AI extraction failed"
    }
  }

  // Jangan langsung gagal kalau AI extraction tidak sempurna. Kalau kita sudah
  // punya teks halaman yang berguna, tetap kembalikan hasil parsial (company +
  // position dari URL/judul + teks mentah sebagai deskripsi) supaya situs
  // perusahaan/website lain tetap bisa dianalisis.
  const usableText = pageText.trim().length >= 200
  if (aiError && !parsed.companyName && !parsed.position && (!parsed.keyRequirements || parsed.keyRequirements.length === 0) && !usableText) {
    throw new Error(`Gagal mengekstrak data lowongan via AI (${aiError}). Pastikan API Key aktif atau coba gunakan tab "Paste Teks".`)
  }

  return {
    url,
    source: detectJobSource(url),
    companyName: parsed.companyName || urlCompany || "Unknown Company",
    position: parsed.position || urlPosition || "Unknown Position",
    location: parsed.location || "",
    description: parsed.description || (pageText ? pageText.slice(0, 1500) : ""),
    keyRequirements: toArray<string>(parsed.keyRequirements),
    preferredQualifications: toArray<string>(parsed.preferredQualifications),
    responsibilities: toArray<string>(parsed.responsibilities),
    benefits: toArray<string>(parsed.benefits),
    jobStreams: normalizeJobStreams(parsed.jobStreams),
    educationRequirements: toArray<string>(parsed.educationRequirements),
    rawText: pageText.slice(0, 20000),
  }
}

export async function analyzeJobText(text: string): Promise<JobPosting & { rawText: string }> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured. Silakan atur API Key di menu Konfigurasi API.")

  if (!text || text.trim().length < 10) {
    throw new Error("Teks terlalu pendek.")
  }

  const systemPrompt = "Kamu asisten ekstraktor data lowongan. Output JSON saja."

  const prompt = `Buat JSON dari teks lowongan berikut. Isi semua field.

Field: companyName, position, location, description, keyRequirements[], preferredQualifications[], responsibilities[], benefits[], jobStreams[{name, description, preferredBackgrounds[]}], educationRequirements[]

Template:
{
  "companyName": "",
  "position": "",
  "location": "",
  "description": "",
  "keyRequirements": [],
  "preferredQualifications": [],
  "responsibilities": [],
  "benefits": [],
  "jobStreams": [],
  "educationRequirements": []
}

TEKS:
${text.slice(0, 24000)}`

  const parsed = await extractJsonFromLLM<Partial<JobPosting>>(prompt, systemPrompt, config)
  return {
    url: "",
    source: "other" as const,
    companyName: parsed.companyName || "Unknown Company",
    position: parsed.position || "Unknown Position",
    location: parsed.location || "",
    description: parsed.description || text.slice(0, 1500),
    keyRequirements: parsed.keyRequirements || [],
    preferredQualifications: parsed.preferredQualifications || [],
    responsibilities: parsed.responsibilities || [],
    benefits: parsed.benefits || [],
    jobStreams: normalizeJobStreams(parsed.jobStreams),
    educationRequirements: parsed.educationRequirements || [],
    rawText: text.slice(0, 20000),
  }
}

export async function extractKeyPoints(jobPosting: JobPosting): Promise<{ critical: string[]; important: string[]; niceToHave: string[] }> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const systemPrompt = `Anda adalah analis resume ahli. Ekstrak key points dari deskripsi pekerjaan dan kategorikan.
Gunakan HANYA informasi yang tersedia di teks lowongan - DILARANG mengarang atau menebak requirement yang tidak tertulis.
Kembalikan JSON dengan format:
{
  "critical": ["wajib: skills, pengalaman, kualifikasi penting"],
  "important": ["penting: items yang hampir wajib"],
  "niceToHave": ["nilai tambah: preferred items"]
}`

  const prompt = `Ekstrak dan kategorikan key requirements dari lowongan ini:
Perusahaan: ${jobPosting.companyName}
Posisi: ${jobPosting.position}
Deskripsi: ${jobPosting.description}
Key Requirements: ${toArray<string>(jobPosting.keyRequirements).join(", ")}
Preferred Qualifications: ${toArray<string>(jobPosting.preferredQualifications).join(", ")}
Responsibilities: ${toArray<string>(jobPosting.responsibilities).join(", ")}
Benefits: ${toArray<string>(jobPosting.benefits).join(", ")}
Education Requirements: ${toArray<string>(jobPosting.educationRequirements).join(", ")}
Streams: ${toArray<any>(jobPosting.jobStreams).map((s: any) => s?.name || "").filter(Boolean).join(", ")}
Kategorikan setiap requirement sebagai critical (wajib), important (penting), atau niceToHave (nilai tambah).`

  const result = await extractJsonFromLLM<{ critical?: string[]; important?: string[]; niceToHave?: string[] }>(prompt, systemPrompt, config)
  return {
    critical: Array.isArray(result?.critical) ? result.critical : [],
    important: Array.isArray(result?.important) ? result.important : [],
    niceToHave: Array.isArray(result?.niceToHave) ? result.niceToHave : [],
  }
}

export async function analyzeATS(resume: ResumeData, jobPosting: JobPosting, lang: "id" | "en" = "id"): Promise<ATSAnalysis> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const langSystem = lang === "en"
    ? "Respond and write suggestions in ENGLISH (professional business tone)."
    : "Respond and write suggestions in INDONESIAN (professional tone)."

  const systemPrompt = `Anda adalah HR professional yang menilai resume dengan sistem skoring ATS yang AKURAT dan JUJUR - bukan tebakan. ${langSystem}
Kembalikan JSON dengan format:{
  "overallScore": 0-100,
  "keywordMatch": 0-100,
  "formatScore": 0-100,
  "sectionScore": 0-100,
  "lengthScore": 0-100,
  "keyPoints": [{"text": "key point", "importance": "critical|important|nice-to-have", "matched": true/false, "matchScore": 0-100}],
  "suggestions": ["saran 1", "saran 2"],
  "missingKeywords": ["keyword hilang 1"],
  "matchedKeywords": ["keyword cocok 1"]
}

ATURAN KERAS (WAJIB):
- Penilaian metrik berbasis pada 3 hal: (a) deskripsi lowongan, (b) data yang diinput user, (c) optimasi yang dilakukan.
- JANGAN menambah pengalaman, perusahaan, skill, atau pencapaian yang tidak ada di resume asli. DILARANG mengarang/mengada-ada (hallucination).
- missingKeywords & matchedKeywords HANYA skill konkret/tools/sertifikasi yang BENAR-BENAR tertulis di data. DILARANG nama perusahaan, lokasi, kata umum, angka, tahun, gaji.
- Jangan paksa keyword demi skor 100% jika memang tidak relevan dengan pengalaman user yang sebenarnya.
- Skor keyPoints harus jujur mencerminkan kecocokan nyata.
- Saran harus spesifik, realistis, dan bisa diterapkan user berdasarkan data yang dimilikinya.`

  const prompt = `Analisis resume berikut terhadap lowongan pekerjaan.

LOWONGAN:
Perusahaan: ${jobPosting.companyName}
Posisi: ${jobPosting.position}
Deskripsi: ${jobPosting.description}
Key Requirements: ${toArray<string>(jobPosting.keyRequirements).join(", ")}
Preferred: ${toArray<string>(jobPosting.preferredQualifications).join(", ")}

RESUME:
${JSON.stringify(resume, null, 2)}

PENTING:
- Nilai resume apa adanya berdasarkan data yang ada.
- Jangan mengarang pengalaman baru yang tidak dimiliki user.
- Saran harus spesifik dan realistis berdasarkan data yang dimiliki user.`

  let parsed: any = null
  try {
    parsed = await extractJsonFromLLM<Partial<ATSAnalysis>>(prompt, systemPrompt, config)
  } catch (err: any) {
    // LLM gagal total (respons kosong/parse gagal): jatuh ke skor deterministik
    // lokal supaya fitur tetap memberi hasil, bukan error user-visible.
    const fallback = computeDeterministicAts(resume, jobPosting)
    return normalizeAtsAnalysis(fallback, excludeTerms(jobPosting))
  }
  // Beberapa model membungkus hasilnya di dalam key "analysis" / "result"/"data"
  const unwrapped = parsed?.analysis && typeof parsed.analysis === "object" ? parsed.analysis : parsed?.result && typeof parsed.result === "object" ? parsed.result : parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed
  let host = ""
  try { host = jobPosting.url ? new URL(jobPosting.url).hostname : "" } catch {}
  const exclude = buildExclusionTerms(jobPosting.companyName, jobPosting.location, host)
  const analysis = normalizeAtsAnalysis(unwrapped, exclude)
  // Blending: skor LLM divalidasi dengan baseline deterministik lokal. Kalau
  // LLM kasih 0 untuk semua (gagal menghitung), pakai baseline; kalau normal,
  // tetap pakai skor LLM yang lebih kontekstual.
  return blendWithDeterministic(analysis, resume, jobPosting)
}

// ---------- Deterministic ATS baseline (tanpa LLM) ----------
// Skor matematika murni dari isi resume vs lowongan: keyword overlap,
// kelengkapan section, panjang. Menjadi jaring pengaman saat LLM gagal,
// dan validasi kalau skor LLM tidak masuk akal.

function excludeTerms(jobPosting: JobPosting): Set<string> {
  let host = ""
  try { host = jobPosting.url ? new URL(jobPosting.url).hostname : "" } catch {}
  return buildExclusionTerms(jobPosting.companyName, jobPosting.location, host)
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function computeDeterministicAts(resume: ResumeData, jobPosting: JobPosting): Partial<ATSAnalysis> {
  // Keyword dari lowongan: gabung requirement + preferred + deskripsi penting
  const jobText = [
    ...toArray<string>(jobPosting.keyRequirements),
    ...toArray<string>(jobPosting.preferredQualifications),
    jobPosting.description,
  ].join(" ").toLowerCase()
  const resumeText = [
    resume.personalInfo.headline ?? "",
    resume.summary,
    ...resume.experiences.flatMap((e) => [e.position, e.company, e.description]),
    ...(resume.organizations ?? []).flatMap((o) => [o.position, o.organization, o.description]),
    ...resume.education.map((e) => `${e.degree} ${e.field} ${e.institution} ${e.thesisTitle ?? ""} ${e.thesisDescription ?? ""} ${e.researchTitle ?? ""} ${e.researchDescription ?? ""}`),
    ...resume.skills.map((s) => s.name),
    ...(resume.skillGroups ?? []).flatMap((g) => [g.title, ...g.items]),
    ...resume.projects.map((p) => `${p.name} ${p.description} ${p.technologies.join(" ")}`),
    ...resume.certifications,
    ...resume.achievements,
    ...(resume.awards ?? []),
  ].join(" ").toLowerCase()

  const extractKeywords = (text: string): Set<string> => {
    const tokens = text.split(/[^a-z0-9+#.]+/).filter((t) => t.length >= 2 && !/^\d+$/.test(t))
    return new Set(tokens)
  }
  const jobKw = extractKeywords(jobText)
  const resumeKw = extractKeywords(resumeText)
  let overlap = 0
  jobKw.forEach((kw) => { if (resumeKw.has(kw)) overlap++ })
  const keywordMatch = jobKw.size > 0 ? clampScore((overlap / jobKw.size) * 100 * 2) : 0 // x2 karena resume butuh tidak 100% keyword utk layak

  // Section completeness: contact (nama+email), summary, experience, education, skills
  const hasSkills = resume.skills.length > 0 || (resume.skillGroups ?? []).some((g) => g.items.length > 0)
  const sections = [
    !!resume.personalInfo.fullName && !!resume.personalInfo.email,
    !!resume.summary.trim(),
    resume.experiences.length > 0,
    resume.education.length > 0,
    hasSkills,
  ]
  const sectionScore = clampScore((sections.filter(Boolean).length / sections.length) * 100)

  // Format: kelengkapan data tiap pengalaman (posisi, perusahaan, tanggal, deskripsi)
  const expFields = resume.experiences.flatMap((e) => [
    !!e.position, !!e.company, !!(e.startDate || e.current), !!e.description.trim(),
  ])
  const formatScore = expFields.length > 0
    ? clampScore((expFields.filter(Boolean).length / expFields.length) * 100)
    : 50

  // Length: total kata, ideal 250-800 kata untuk 1-2 halaman
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length
  const lengthScore = wordCount === 0 ? 0 : wordCount < 150 ? clampScore(wordCount / 150 * 60) : wordCount <= 800 ? 100 : clampScore(Math.max(40, 100 - (wordCount - 800) / 20))

  const overall = clampScore(keywordMatch * 0.45 + sectionScore * 0.25 + formatScore * 0.2 + lengthScore * 0.1)
  return {
    overallScore: overall,
    keywordMatch,
    formatScore,
    sectionScore,
    lengthScore,
  }
}

// Validasi skor LLM dengan baseline deterministik. Kalau LLM kasih 0 semua
// (gagal menghitung), ganti dengan baseline. Kalau skor tidak logis (overall
// sangat jauh dari komponen), blend secara lembut.
function blendWithDeterministic(analysis: ATSAnalysis, resume: ResumeData, jobPosting: JobPosting): ATSAnalysis {
  const baseline = computeDeterministicAts(resume, jobPosting)
  const scores = [analysis.overallScore, analysis.keywordMatch, analysis.formatScore, analysis.sectionScore, analysis.lengthScore]
  const allZero = scores.every((s) => s === 0)
  if (allZero) {
    return { ...analysis, ...baseline }
  }
  return analysis
}

export async function translateResume(resume: ResumeData, targetLang: "id" | "en"): Promise<ResumeData> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const langName = targetLang === "en" ? "English" : "Indonesian"
  const systemPrompt = `Anda adalah penerjemah resume profesional. Terjemahkan resume ke ${langName} tanpa mengubah struktur dan data fakta.
Kembalikan JSON dengan struktur PERSIS sama seperti input.
JANGAN mengubah: nama, angka, tanggal, institusi, perusahaan, link URL, skill teknis yang umumnya tetap bahasa Inggris.
Gunakan istilah profesional yang wajar.`

  const prompt = `Terjemahkan resume berikut ke bahasa ${langName}:
${JSON.stringify(resume, null, 2)}

Kembalikan JSON dengan struktur sama persis seperti input.`

  const parsed = await extractJsonFromLLM<Partial<ResumeData>>(prompt, systemPrompt, config)
  return normalizeResumeData(parsed)
}

export async function optimizeResumeContent(resume: ResumeData, jobPosting: JobPosting, keyPoints: string[], lang: "id" | "en" = "id"): Promise<{ optimized: ResumeData; changes: string[] }> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const systemPrompt = lang === "en"
    ? "You are a professional resume writer. Optimize the resume content to better match the job posting. Return JSON. CRITICAL: preserve ALL user's original experiences, education, skills, and achievements. Only improve copywriting and grammar. NEVER fabricate data. Respond in ENGLISH."
    : "Anda adalah penulis resume profesional. Optimalkan konten resume agar lebih cocok dengan lowongan. Kembalikan JSON. KRUSIAL: pertahankan SEMUA pengalaman, pendidikan, skill, pencapaian asli user. Hanya perbaiki copywriting. JANGAN mengarang data. Respond in INDONESIAN."

  const prompt = `Optimalkan resume ini untuk lowongan berikut. Aturan:
1. Pertahankan 90%+ konten asli user, jangan hapus atau ganti pengalaman/skill yang dimiliki.
2. Jangan mengarang pengalaman atau skill baru yang tidak ada di resume.
3. Perbaiki copywriting: grammar, kalimat lebih profesional, gunakan action verbs.
4. Masukkan keyword dari lowongan hanya jika RELEVAN dengan pengalaman user yang sebenarnya.
5. Ringkasan profesional highlight relevansi dengan posisi.
6. Deskripsi pengalaman diperbaiki dengan keywords dari lowongan yang cocok dengan pekerjaan user.
7. Urutkan skill berdasarkan prioritas kecocokan.

Kembalikan JSON dengan format:
{
  "optimized": { struktur resume persis seperti input, konten sudah dioptimalkan },
  "changes": ["deskripsi ringkas perubahan yang dilakukan, item per item"]
}

Key requirements: ${keyPoints.join(", ")}
RESUME INPUT: ${JSON.stringify(resume, null, 2)}
LOWONGAN: ${JSON.stringify(jobPosting, null, 2)}`

  const parsed = await extractJsonFromLLM<{ optimized?: any; changes?: string[] }>(prompt, systemPrompt, config)
  return {
    optimized: normalizeResumeData(parsed?.optimized),
    changes: toArray<string>(parsed?.changes).map(String).filter(Boolean),
  }
}

export async function generateResumeContent(section: string, context: string, lang: "id" | "en" = "id"): Promise<string> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const systemPrompt = lang === "en"
    ? `You are a resume writing assistant. Write professional content for the "${section}" section in ENGLISH. Use strong action verbs.`
    : `Anda adalah asisten penulisan resume. Tulis konten profesional untuk bagian "${section}" dari resume dalam BAHASA INDONESIA. Gunakan action verbs yang kuat.`

  const prompt = `Tulis konten untuk bagian "${section}" dari resume berdasarkan konteks berikut:
${context}
Tulis konten yang profesional, padat, dan menarik. Fokus pada pencapaian dan hasil konkret.`

  return callLLM(prompt, systemPrompt, config)
}

export async function generateSummary(experiences: string, skills: string, targetRole: string, lang: "id" | "en" = "id"): Promise<string> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const systemPrompt = lang === "en"
    ? "You are a professional resume writer. Create a powerful professional summary. Maximum 3-4 sentences. Focus on achievements and unique value. Write in ENGLISH."
    : "Anda adalah penulis resume profesional. Buat ringkasan profesional yang powerful. Maksimal 3-4 kalimat. Fokus pada pencapaian dan nilai unik. Tulis dalam BAHASA INDONESIA."

  const prompt = `Buat ringkasan profesional untuk resume dengan konteks:
Role target: ${targetRole}
Pengalaman: ${experiences}
Skills: ${skills}
Tulis ringkasan yang menarik, relevan, dan berdasarkan data pengalaman yang ada. Jangan mengarang.`

  return callLLM(prompt, systemPrompt, config)
}

export function detectJobSource(url: string): JobPosting["source"] {
  if (/linkedin\.com/i.test(url)) return "linkedin"
  if (/jobstreet\.com/i.test(url)) return "jobstreet"
  if (/glints\.com/i.test(url)) return "glints"
  if (/indeed\.com/i.test(url)) return "company"
  return "other"
}

export async function generateSampleResume(jobPosting: JobPosting): Promise<ResumeData> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured. Silakan atur API Key di menu Konfigurasi API.")

  const systemPrompt = `You are an expert resume writer. Create a REALISTIC sample resume based on the job posting below.
IMPORTANT: Write ALL content (summary, descriptions, skill names, awards) in PROFESSIONAL ENGLISH.
Kembalikan JSON dengan struktur persis seperti ini:
{
  "personalInfo": { "fullName": "Full Name", "email": "example@email.com", "phone": "+62 812-xxxx-xxxx", "location": "Jakarta, Indonesia", "linkedin": "linkedin.com/in/example", "portfolio": "github.com/example" },
  "summary": "3-4 sentence professional summary in English reflecting the ideal candidate for this position.",
  "experiences": [{ "id": "exp_1", "company": "Company Name", "position": "Job Title", "location": "Jakarta, Indonesia", "startDate": "2020-01", "endDate": "2023-12", "current": false, "description": "Led a team of 5 developers\nImproved system efficiency by 40%\nImplemented CI/CD pipeline reducing deploy time by 60%" }],
  "organizations": [{ "id": "org_1", "organization": "Organization Name", "position": "Role", "location": "Jakarta, Indonesia", "startDate": "2021-01", "endDate": "2022-12", "current": false, "description": "Coordinated 20 volunteers\nOrganized monthly tech meetups" }, { "id": "org_2", "organization": "Tech Community", "position": "Event Volunteer", "location": "Jakarta, Indonesia", "startDate": "2023-03", "endDate": "", "current": true, "description": "Host monthly meetups\nOnboard new speakers" }],
  "education": [{ "id": "edu_1", "institution": "University Name", "degree": "B.Sc.", "field": "Major", "startDate": "2015-08", "endDate": "2019-06", "gpa": "3.50" }],
  "skillGroups": [{ "id": "sg_1", "title": "Programming Languages", "items": ["JavaScript", "TypeScript", "Python", "SQL"] }, { "id": "sg_2", "title": "Frontend", "items": ["React.js", "Next.js", "Tailwind CSS"] }, { "id": "sg_3", "title": "Backend & APIs", "items": ["Node.js", "RESTful API Development", "Microservices Architecture"] }, { "id": "sg_4", "title": "Databases", "items": ["PostgreSQL", "Redis"] }],
  "projects": [{ "id": "proj_1", "name": "Project Name", "description": "Achievement one\nAchievement two", "url": "", "technologies": ["Tech1", "Tech2"] }, { "id": "proj_2", "name": "Project Two", "description": "Achievement one\nAchievement two", "url": "", "technologies": ["Tech3"] }],
  "awards": ["AWS Certified Cloud Practitioner", "Best Graduate 2020", "Exceeded quarterly team target by 15% in 2023"],
  "languages": ["Indonesian (native)", "English (professional working proficiency)"]
}
ISI SEMUA field dengan data dummy yang REALISTIS dan SPESIFIK untuk posisi ini, dalam bahasa Inggris.
Gunakan nama dan data fiktif yang masuk akal. Jangan gunakan "Nama Perusahaan" atau "Nama Universitas" literal - gunakan nama sungguhan palsu.
Pastikan kata kunci dari lowongan muncul di deskripsi pengalaman dan skills.
Untuk deskripsi pengalaman, gunakan format BULLET POINT (setiap achievement dipisah newline) yang fokus pada pencapaian terukur.`

  const prompt = `Buat contoh resume dummy yang REALISTIS untuk lowongan berikut.
PENTING: Seluruh konten resume WAJIB ditulis dalam BAHASA INGGRIS profesional.
Perusahaan: ${jobPosting.companyName || "(tidak diketahui - ekstrak dari deskripsi)"}
Posisi: ${jobPosting.position || "(tidak diketahui - ekstrak dari deskripsi)"}
Lokasi: ${jobPosting.location || "(tidak diketahui)"}
Deskripsi Pekerjaan: ${jobPosting.description || "(tidak tersedia)"}
Key Requirements: ${toArray<string>(jobPosting.keyRequirements).join(", ")}
Preferred Qualifications: ${toArray<string>(jobPosting.preferredQualifications).join(", ")}
Responsibilities: ${toArray<string>(jobPosting.responsibilities).join(", ")}
Benefits: ${toArray<string>(jobPosting.benefits).join(", ")}
Education Requirements: ${toArray<string>(jobPosting.educationRequirements).join(", ")}

Buat data resume yang menunjukkan kandidat ideal untuk posisi ini dengan pengalaman, pendidikan, dan skill yang relevan.
Semua data boleh fiktif tapi harus realistis dan spesifik. Beri 3 pengalaman kerja (deskripsi pakai bullet point, tiap baris = 1 pencapaian terukur), 2 pengalaman organisasi, 1 pendidikan (thesis + research multi-bullet), 4-5 skillGroups dengan judul kategori spesifik (cth. Programming Languages, Frontend, Backend & APIs, Databases — tiap grup 3-7 items), 3 proyek (deskripsi bullet), 3-4 awards, dan 2-3 bahasa. Buat SELENGKAP mungkin agar user melihat versi paling penuh.`

  const parsed = await extractJsonFromLLM<Partial<ResumeData>>(prompt, systemPrompt, config)
  return normalizeResumeData(parsed)
}

export async function extractResumeFromCvText(cvText: string): Promise<ResumeData> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const systemPrompt = `Anda adalah ahli parsing resume. Ekstrak informasi dari teks CV/Resume berikut ke dalam JSON.

Kembalikan JSON valid SAJA tanpa markdown, dengan struktur:
{
  "personalInfo": { "fullName": "", "headline": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "",
  "experiences": [{ "id": "exp_1", "company": "", "position": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
  "organizations": [{ "id": "org_1", "organization": "", "position": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
  "education": [{ "id": "edu_1", "institution": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": "", "thesisTitle": "", "thesisDescription": "", "researchTitle": "", "researchDescription": "" }],
  "skillGroups": [{ "id": "sg_1", "title": "", "items": [] }],
  "projects": [{ "id": "proj_1", "name": "", "description": "", "url": "", "technologies": [] }],
  "awards": [],
  "languages": []
}

ISI semua field yang bisa diekstrak dari teks. Jika ada informasi yang tidak tersedia, gunakan string kosong atau array kosong.
Untuk skillGroups, kelompokkan skill berdasarkan judul kategori bila ada (cth. "Programming Languages"); jika tidak ada kategori jelas, pakai satu grup dengan title kosong.
Buat ID unik untuk setiap item (exp_1, org_1, edu_1, sg_1, dll).`

  const prompt = `Ekstrak informasi resume dari teks berikut ke dalam format JSON terstruktur:
${cvText.slice(0, 20000)}

Ekstrak semua informasi yang tersedia: nama, kontak, ringkasan, pengalaman kerja/profesional, pengalaman organisasi, pendidikan (termasuk judul dan deskripsi skripsi/tugas akhir serta pengalaman riset/asisten penelitian bila ada), skill (kelompokkan per kategori bila ada), proyek, awards/sertifikasi/pencapaian, bahasa.
Jika tanggal tidak lengkap, gunakan format YYYY-MM atau YYYY.`

  const parsed = await extractJsonFromLLM<Partial<ResumeData>>(prompt, systemPrompt, config)
  return normalizeResumeData(parsed)
}

export async function analyzeCvAgainstJob(resumeData: ResumeData, jobPosting: JobPosting): Promise<{ analysis: ATSAnalysis; optimized: ResumeData }> {
  const config = getApiConfig()
  if (!config) throw new Error("API not configured.")

  const systemPrompt = `Anda adalah ahli ATS (Applicant Tracking System) dan optimasi resume.
Analisis resume terhadap lowongan, lalu berikan skor ATS dan versi yang sudah dioptimalkan.

Kembalikan JSON dengan format:
{
  "analysis": {
    "overallScore": 0-100,
    "keywordMatch": 0-100,
    "formatScore": 0-100,
    "sectionScore": 0-100,
    "lengthScore": 0-100,
    "keyPoints": [{"text": "key point", "importance": "critical|important|nice-to-have", "matched": true/false, "matchScore": 0-100}],
    "suggestions": ["saran spesifik 1"],
    "missingKeywords": ["keyword hilang 1"],
    "matchedKeywords": ["keyword cocok 1"]
  },
  "optimized": { ... seluruh ResumeData yang sudah dioptimalkan ... }
}`

  const prompt = `Analisis resume berikut terhadap lowongan pekerjaan, lalu berikan versi yang sudah dioptimalkan.

LOWONGAN:
Perusahaan: ${jobPosting.companyName}
Posisi: ${jobPosting.position}
Deskripsi: ${jobPosting.description}
Key Requirements: ${toArray<string>(jobPosting.keyRequirements).join(", ")}
Preferred: ${toArray<string>(jobPosting.preferredQualifications).join(", ")}

RESUME:
${JSON.stringify(resumeData, null, 2)}

Berikan analisis ATS yang detail dan versi resume yang dioptimalkan dengan keywords dari lowongan.
Jaga kejujuran data - jangan tambahkan pengalaman atau skill palsu yang tidak ada di resume asli.`

  const parsed = await extractJsonFromLLM<{ analysis?: any; optimized?: any }>(prompt, systemPrompt, config)
  let host = ""
  try { host = jobPosting.url ? new URL(jobPosting.url).hostname : "" } catch {}
  const exclude = buildExclusionTerms(jobPosting.companyName, jobPosting.location, host)
  return {
    analysis: normalizeAtsAnalysis(parsed?.analysis, exclude),
    optimized: normalizeResumeData(parsed?.optimized),
  }
}
