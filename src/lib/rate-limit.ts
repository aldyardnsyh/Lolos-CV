import type { NextRequest } from "next/server"

// Rate limiter in-memory (sliding window per IP + route).
//
// BATASAN: di serverless (Vercel) tiap instance punya bucket sendiri,
// jadi ini menahan spam/abuse kasual & bot sederhana, BUKAN serangan
// terdistribusi besar. Untuk proteksi DDoS andalkan edge provider.
// Bucket disimpan di globalThis agar selamat dari HMR/reload modul.

type Bucket = number[]

function store(): Map<string, Bucket> {
  const g = globalThis as unknown as { __rlBuckets?: Map<string, Bucket> }
  if (!g.__rlBuckets) g.__rlBuckets = new Map()
  return g.__rlBuckets
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown"
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const buckets = store()
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
