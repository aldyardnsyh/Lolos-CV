import type { NextRequest } from "next/server"

// Rate limiter terdistribusi (fix temuan audit S3/A5):
// bucket fixed-window disimpan di Upstash/Vercel KV sehingga berlaku lintas
// instance serverless. Bila KV tidak dikonfigurasi (dev lokal) atau KV gagal,
// fallback ke limiter in-memory lama — limiter TIDAK BOLEH bikin request crash.
//
// Batasan fallback in-memory (self-hosted tanpa KV): tiap instance punya
// bucket sendiri, jadi hanya menahan spam kasual, bukan serangan terdistribusi.

type Bucket = number[]

function memoryStore(): Map<string, Bucket> {
  const g = globalThis as unknown as { __rlBuckets?: Map<string, Bucket> }
  if (!g.__rlBuckets) g.__rlBuckets = new Map()
  return g.__rlBuckets
}

// Limiter in-memory (sliding window) — jalur fallback.
function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const buckets = memoryStore()
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= limit) {
    buckets.set(key, arr)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000)) }
  }
  arr.push(now)
  buckets.set(key, arr)
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => {
      if (v.length === 0 || v[v.length - 1] < now - windowMs) buckets.delete(k)
    })
  }
  return { ok: true }
}

// Sumber env KV sama dengan donations-store.ts (Vercel KV maupun Upstash Redis).
const KV_URL =
  process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const KV_READY = !!(KV_URL && KV_TOKEN)

// Klien KV di-cache di globalThis agar tidak membuat koneksi baru per request.
// Hasil import gagal juga di-cache (null) supaya tidak retry tiap request.
async function kvClient(): Promise<import("@vercel/kv").VercelKV | null> {
  if (!KV_READY || !KV_URL || !KV_TOKEN) return null
  const g = globalThis as unknown as {
    __rlKvClient?: Promise<import("@vercel/kv").VercelKV | null>
  }
  if (!g.__rlKvClient) {
    g.__rlKvClient = import("@vercel/kv")
      .then(({ createClient }) => createClient({ url: KV_URL, token: KV_TOKEN }))
      .catch(() => null)
  }
  return g.__rlKvClient
}

export function clientIp(req: NextRequest): string {
  // Urutan kepercayaan (fix temuan audit: XFF leftmost bisa dipalsukan klien):
  // 1. x-real-ip — diset/ditimpa oleh platform (Vercel) di edge, tidak bisa
  //    diisi bebas oleh klien.
  const real = req.headers.get("x-real-ip")?.trim()
  if (real) return real
  // 2. x-vercel-forwarded-for — header internal Vercel berisi IP asli klien.
  const vercelFwd = req.headers.get("x-vercel-forwarded-for")?.trim()
  if (vercelFwd) {
    const first = vercelFwd.split(",")[0]?.trim()
    if (first) return first
  }
  // 3. Fallback self-hosted: XFF leftmost. LEMAH: klien bisa menambah entri
  //    sendiri di depan XFF (rate limit per-IP bisa di-bypass header) kecuali
  //    reverse proxy di depan app menimpa XFF (mis. nginx
  //    `$proxy_add_x_forwarded_for` / Cloudflare). Di Vercel jalur ini nyaris
  //    tidak pernah terpakai karena x-real-ip selalu diset platform.
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first) return first
  }
  return "unknown"
}

// Cek + hitung rate limit. Window fixed-window di KV: counter INCR per key,
// EXPIRE dipasang HANYA saat counter pertama kali dibuat (count === 1) supaya
// window tidak ter-reset oleh expire berulang.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  const client = await kvClient()
  if (client) {
    const kvKey = `rl:${key}`
    try {
      const count = await client.incr(kvKey)
      if (count === 1) {
        try {
          await client.expire(kvKey, windowSec)
        } catch {
          // TTL gagal dipasang → counter bisa mengunci permanen. Hapus
          // counter (fail-open untuk window ini) lalu pakai fallback.
          try {
            await client.del(kvKey)
          } catch {}
          return memoryRateLimit(key, limit, windowMs)
        }
      }
      if (count > limit) {
        return { ok: false, retryAfterSec: windowSec }
      }
      return { ok: true }
    } catch {
      // KV gagal (network/timeout) → jangan crash, pakai fallback in-memory.
      return memoryRateLimit(key, limit, windowMs)
    }
  }
  return memoryRateLimit(key, limit, windowMs)
}
