import { lookup } from "dns/promises"

// Pertahanan SSRF berlapis untuk fetch server-side terhadap URL input user.
//
// Cek string hostname SAJA tidak cukup — lolos lewat:
//  - IP numerik/hex/oktal: http://2130706433/ (= 127.0.0.1), http://0x7f.0.0.1/
//  - DNS rebinding: evil.com yang resolve ke IP privat
// Karena itu hostname SELALU di-resolve via DNS (getaddrinfo ikut
// mengurai bentuk numerik) lalu IP hasilnya divalidasi.
//
// Batasan yang disadari: ada jeda TOCTOU kecil antara resolve & fetch
// (DNS bisa berubah di antaranya). Untuk tingkat ancaman app ini
// (relay publik, bukan rahasia negara), ini sudah jauh lebih kuat
// daripada cek string — resolver yang gigih butuh kontrol penuh atas
// DNS + timing, sementara hasilnya tetap dibatasi response cap.

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null
    const v = Number(p)
    if (v < 0 || v > 255) return null
    n = n * 256 + v
  }
  return n >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true // tidak dikenali → anggap berbahaya
  const inRange = (base: string, bits: number) => {
    const b = ipv4ToInt(base)
    if (b === null) return false
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (n & mask) === (b & mask)
  }
  return (
    inRange("10.0.0.0", 8) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.168.0.0", 16) ||
    inRange("127.0.0.0", 8) ||
    inRange("0.0.0.0", 8) ||
    inRange("169.254.0.0", 16) ||
    inRange("100.64.0.0", 10) ||
    inRange("192.0.2.0", 24) ||
    inRange("198.51.100.0", 24) ||
    inRange("203.0.113.0", 24) ||
    inRange("224.0.0.0", 4)
  )
}

function isLoopbackIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return false
  const base = ipv4ToInt("127.0.0.0")
  return base !== null && (n & 0xff000000) >>> 0 === (base & 0xff000000) >>> 0
}

function normalizeIp(raw: string): string {
  let ip = raw.trim().replace(/^\[|\]$/g, "").toLowerCase()
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) → perlakukan sebagai IPv4-nya
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return mapped[1]
  // 6to4/teredo dsb. — tolak saja
  return ip
}

function isPrivateIP(ipRaw: string): boolean {
  const ip = normalizeIp(ipRaw)
  if (ip.includes(":")) {
    // IPv6: tolak loopback, unspecified, link-local, unique-local
    if (ip === "::1" || ip === "::") return true
    if (ip.startsWith("fe80:") || ip.startsWith("fe80")) return true
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true
    if (/^[0-9a-f:]+$/.test(ip)) return false // global unicast → publik
    return true
  }
  return isPrivateIPv4(ip)
}

function isLoopbackIP(ipRaw: string): boolean {
  const ip = normalizeIp(ipRaw)
  if (ip === "::1") return true
  if (ip.includes(":")) return false
  return isLoopbackIPv4(ip)
}

async function resolveHost(hostname: string): Promise<string[]> {
  const clean = hostname.trim().replace(/^\[|\]$/g, "")
  if (!clean) throw new Error("Hostname kosong")
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DNS timeout")), 5000)
  )
  const addrs = await Promise.race([
    lookup(clean, { all: true }).then((list) => list.map((r) => r.address)),
    timer,
  ])
  if (!addrs.length) throw new Error("DNS tidak resolve")
  return addrs
}

export type SsrfOptions = {
  /** true → 127.0.0.1/::1/lokal diizinkan (kasus: server LLM lokal). Default false. */
  allowLoopback?: boolean
}

/** Validasi URL + resolve DNS. Throw bila tidak aman. Kembalikan URL string. */
export async function assertSafeTarget(raw: string, opts: SsrfOptions = {}): Promise<string> {
  const { allowLoopback = false } = opts
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error("URL tidak valid")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Hanya URL http(s) yang didukung")
  }
  if (parsed.username || parsed.password) {
    throw new Error("URL dengan kredensial tidak diizinkan")
  }
  const addrs = await resolveHost(parsed.hostname)
  for (const addr of addrs) {
    if (isLoopbackIP(addr)) {
      if (!allowLoopback) throw new Error("Target loopback tidak diizinkan")
      continue
    }
    if (isPrivateIP(addr)) throw new Error("Target privat tidak diizinkan")
  }
  return parsed.toString()
}

/**
 * Fetch dengan redirect MANUAL: tiap hop (maks `maxHops`) divalidasi ulang
 * via assertSafeTarget. Mencegah redirect awal-publik → akhir-privat.
 */
export async function fetchValidated(
  url: string,
  init: RequestInit,
  opts: SsrfOptions & { maxHops?: number } = {}
): Promise<Response> {
  const { maxHops = 3, ...ssrfOpts } = opts
  let current = await assertSafeTarget(url, ssrfOpts)
  for (let hop = 0; hop <= maxHops; hop++) {
    const res = await fetch(current, { ...init, redirect: "manual" })
    if (![301, 302, 303, 307, 308].includes(res.status)) return res
    if (hop === maxHops) {
      await res.arrayBuffer().catch(() => {})
      throw new Error("Terlalu banyak redirect")
    }
    const loc = res.headers.get("location")
    await res.arrayBuffer().catch(() => {})
    if (!loc) throw new Error("Redirect tanpa Location")
    let next: string
    try {
      next = new URL(loc, current).toString()
    } catch {
      throw new Error("Redirect URL tidak valid")
    }
    current = await assertSafeTarget(next, ssrfOpts)
  }
  throw new Error("Redirect gagal")
}
