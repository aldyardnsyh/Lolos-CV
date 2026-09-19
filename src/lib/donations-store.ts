// Storage bersama untuk donasi (dipakai /api/donations & /api/saweria-webhook).
// Data disimpan di Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN).
// Fallback ke array in-memory saat dev lokal.

const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

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
