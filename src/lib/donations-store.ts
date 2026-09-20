// Storage bersama untuk donasi (dipakai /api/donations & /api/saweria-webhook).
// Data disimpan di Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN).
// Fallback ke array in-memory saat dev lokal.

// Mendukung Vercel KV maupun Upstash Redis (nama env UPSTASH_*).
const KV_URL =
  process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

const KV_READY = !!(KV_URL && KV_TOKEN)

export type Donation = {
  id: string
  name: string
  amount: number
  date: string
  status: "pending" | "verified"
  /** "manual" = form QRIS + verifikasi admin, "saweria" = webhook otomatis */
  source?: "manual" | "saweria"
  /** ID donasi dari Saweria (untuk idempotency webhook) */
  saweriaId?: string
  /** Pesan donatur (dari Saweria) */
  message?: string
}

export const MAX_NAME_LENGTH = 40
export const MAX_AMOUNT = 10_000_000

// Fail-closed: di production, fungsi admin MATI TOTAL bila ADMIN_TOKEN
// tidak diset (mencegah verifikasi/hapus donasi oleh orang asing).
// Di dev lokal, fallback default memudahkan uji alur manual.
export const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN || (process.env.NODE_ENV === "production" ? "" : "admin-loloscv")

export function isAdminAuthorized(token: string): boolean {
  if (!ADMIN_TOKEN) return false
  return token === ADMIN_TOKEN
}

// Batas anti-bloat: spammer tidak bisa menggembungkan storage tanpa batas.
// Saat penuh, buang pending terlama dulu; verified hanya terbuang bila
// tidak ada pending tersisa (kondisi ekstrem, tercatat di bawah).
export const MAX_STORED_DONATIONS = 1000

export function pruneDonations(list: Donation[]): Donation[] {
  while (list.length > MAX_STORED_DONATIONS) {
    const pendIdx = list.findIndex((d) => d.status === "pending")
    if (pendIdx !== -1) list.splice(pendIdx, 1)
    else list.shift()
  }
  return list
}

const MEMORY_STORE: Donation[] = []

async function getClient(): Promise<import("@vercel/kv").VercelKV | null> {
  if (!KV_READY || !KV_URL || !KV_TOKEN) return null
  try {
    const { createClient } = await import("@vercel/kv")
    return createClient({ url: KV_URL, token: KV_TOKEN })
  } catch {
    return null
  }
}

export async function listDonations(): Promise<Donation[]> {
  const client = await getClient()
  if (!client) return MEMORY_STORE
  try {
    const data = (await client.get<Donation[]>("donations")) || []
    return Array.isArray(data) ? data : []
  } catch {
    return MEMORY_STORE
  }
}

export async function saveDonations(donations: Donation[]): Promise<void> {
  const client = await getClient()
  if (!client) return
  try {
    await client.set("donations", donations)
  } catch {}
}

export function sanitizeName(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : ""
  return s.slice(0, MAX_NAME_LENGTH)
}
