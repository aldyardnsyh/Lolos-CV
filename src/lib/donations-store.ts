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

// --- Storage per-key (fix race read-modify-write satu array besar) ---
//
// - Tiap donasi tersimpan di key `donation:<id>` di mana id = saweriaId
//   (donasi webhook Saweria) atau id internal (form manual, tanpa saweriaId).
//   Key per-donasi membuat idempotensi webhook aman: event yang sama dengan
//   saweriaId sama menimpa key yang sama, bukan menambah duplikat.
// - Index `donation:ids` berisi daftar id storage, TERBARU DULUAN.
// - Key lama "donations" (array tunggal) dimigrasi sekali ke per-key saat
//   dibaca, bila index masih kosong (lihat listDonations).
//
// Urutan array di level pemanggil TETAP terlama-dulu (sama seperti perilaku
// lama) supaya pruneDonations dan agregasi leaderboard tidak berubah; index
// KV yang dibalik (terbaru dulu) sesuai kontrak storage.
const DONATION_KEY_PREFIX = "donation:"
const INDEX_KEY = "donation:ids"
const LEGACY_LIST_KEY = "donations"

function storageIdOf(d: Donation): string {
  return d.saweriaId || d.id
}

function donationKey(storageId: string): string {
  return DONATION_KEY_PREFIX + storageId
}

export async function listDonations(): Promise<Donation[]> {
  const client = await getClient()
  if (!client) return MEMORY_STORE
  // Tidak ada catch → bila KV gagal dibaca, error naik ke caller (route
  // membalas 500) daripada leaderboard tampil kosong secara senyap.
  const ids = await client.get<string[]>(INDEX_KEY)
  if (Array.isArray(ids) && ids.length > 0) {
    const keys = ids.map(donationKey)
    let values: Array<Donation | null>
    if (typeof client.mget === "function") {
      values = (await client.mget(...keys)) as Array<Donation | null>
    } else {
      values = await Promise.all(keys.map((k) => client.get<Donation>(k)))
    }
    // Index terbaru-dulu → balik jadi terlama-dulu (urutan kontrak pemanggil).
    return values.filter((d): d is Donation => d != null).reverse()
  }

  // --- MIGRASI sekali dari key lama "donations" (array tunggal) ---
  const legacy = await client.get<Donation[]>(LEGACY_LIST_KEY)
  if (Array.isArray(legacy) && legacy.length > 0) {
    // Tulis per-key + index terbaru-dulu. Konversi idempoten: penulis
    // konkurensi menghasilkan data yang sama.
    await Promise.all(legacy.map((d) => client.set(donationKey(storageIdOf(d)), d)))
    await client.set(
      INDEX_KEY,
      legacy.map((d) => storageIdOf(d)).reverse()
    )
    // Hapus key lama agar migrasi tidak dipicu terus (best-effort: bila
    // gagal, index sudah terisi sehingga migrasi tetap tidak diulang).
    try {
      await client.del(LEGACY_LIST_KEY)
    } catch {}
    return legacy
  }
  return []
}

// Simpan daftar donasi penuh (urutan terlama-dulu, hasil listDonations +
// mutasi). Menulis per-key (upsert), memperbarui index, dan menghapus key
// entri yang keluar dari daftar (terhapus admin / terprune).
//
// TIDAK menelan error (fix temuan audit: catch {} kosong) — bila KV gagal,
// fungsi THROW sehingga caller wajib membalas gagal (Saweria akan retry).
export async function saveDonations(donations: Donation[]): Promise<void> {
  const client = await getClient()
  if (!client) {
    // Tanpa KV (dev lokal): data hidup di MEMORY_STORE (dimutasi langsung
    // oleh caller lewat referensi array dari listDonations). Di production
    // tanpa KV ini berarti tidak persisten — beri tahu dengan jelas.
    if (KV_READY) {
      console.error("[donations] KV terkonfigurasi tapi klien gagal dibuat; data hanya di memori")
    } else if (process.env.NODE_ENV === "production") {
      console.error("[donations] KV tidak dikonfigurasi; donasi hanya tersimpan di memori instance ini")
    }
    return
  }
  const storageIds = donations.map(storageIdOf)
  const oldIds = (await client.get<string[]>(INDEX_KEY)) || []
  const removed = Array.isArray(oldIds)
    ? oldIds.filter((id) => !storageIds.includes(id))
    : []
  await Promise.all(
    donations.map((d, i) => client.set(donationKey(storageIds[i]), d))
  )
  // Index terbaru-dulu: balik urutan array pemanggil (terlama-dulu).
  await client.set(INDEX_KEY, [...storageIds].reverse())
  if (removed.length > 0) {
    await Promise.all(removed.map((id) => client.del(donationKey(id))))
  }
}

export function sanitizeName(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : ""
  return s.slice(0, MAX_NAME_LENGTH)
}
