import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import {
  listDonations,
  saveDonations,
  sanitizeName,
  MAX_AMOUNT,
} from "@/lib/donations-store"

// Webhook Saweria → leaderboard otomatis.
//
// CARA PAKAI (setelah deploy, mis. ke Vercel):
// 1. Login saweria.co → Settings/Integrations → Webhook.
// 2. Isi Webhook URL dengan:
//      https://<domain-kamu>/api/saweria-webhook?secret=<RAHASIA-BEBAS>
//    (ganti <RAHASIA-BEBAS> dengan string acak, simpan sebagai SAWERIA_QUERY_SECRET)
// 3. (Opsional, disarankan) Verifikasi signature HMAC:
//    - Buka Overlay → Alert Widget, salin streamKey dari URL widget
//      (https://saweria.co/widgets/alert?streamKey=xxx)
//    - Simpan sebagai SAWERIA_WEBHOOK_SECRET.
//    Saweria menandatangani tiap request dengan HMAC-SHA256 dari
//    version + id + amount_raw + donator_name + donator_email,
//    dikirim di header `Saweria-Callback-Signature`.
// 4. Donasi yang masuk otomatis tersimpan verified & tampil di leaderboard.
//    NOTE: webhook tidak bisa menjangkau localhost — wajib URL publik (deploy dulu).
//
// ENV yang didukung:
//   SAWERIA_WEBHOOK_SECRET — signing secret (streamKey) untuk verifikasi HMAC
//   SAWERIA_QUERY_SECRET   — secret bebas untuk dicocokkan dengan ?secret=

const SIGNING_SECRET = process.env.SAWERIA_WEBHOOK_SECRET || ""
const QUERY_SECRET = process.env.SAWERIA_QUERY_SECRET || ""

function verifySignature(body: any, signature: string): boolean {
  if (!SIGNING_SECRET) return false
  const base = [
    body?.version ?? "",
    body?.id ?? "",
    String(body?.amount_raw ?? ""),
    body?.donator_name ?? "",
    body?.donator_email ?? "",
  ].join("")
  const expected = createHmac("sha256", SIGNING_SECRET).update(base, "utf8").digest("hex")
  const a = Buffer.from(expected.toLowerCase(), "utf8")
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8")
  try {
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// GET — health check (buka di browser untuk pastikan route hidup)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Saweria webhook aktif. Set URL ini di dashboard Saweria (Settings → Webhook).",
  })
}

// POST — menerima event donasi dari Saweria
export async function POST(request: NextRequest) {
  // Fail-closed di production: tanpa secret apa pun, tolak semua event
  // (mencegah donasi palsu masuk leaderboard). Mode dev tetap longgar.
  if (process.env.NODE_ENV === "production" && !SIGNING_SECRET && !QUERY_SECRET) {
    return NextResponse.json({ error: "Webhook belum dikonfigurasi" }, { status: 503 })
  }

  let body: any = null
  let raw = ""
  try {
    raw = await request.text()
    body = raw ? JSON.parse(raw) : {}
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 })
  }

  // Abaikan event non-donasi (tetap 200 agar Saweria tidak retry)
  const type = typeof body?.type === "string" ? body.type : ""
  if (type && !/donat|media/i.test(type)) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  // --- Autentikasi ---
  const signature = request.headers.get("saweria-callback-signature") || ""
  if (SIGNING_SECRET && signature) {
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 })
    }
  } else if (QUERY_SECRET) {
    const secret = request.nextUrl.searchParams.get("secret") || ""
    if (secret !== QUERY_SECRET) {
      return NextResponse.json({ error: "Secret tidak valid" }, { status: 401 })
    }
  } else if (SIGNING_SECRET && !signature) {
    // Secret dikonfigurasi tapi request tanpa signature & tanpa secret query → tolak
    const secret = request.nextUrl.searchParams.get("secret") || ""
    if (!secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  // Tanpa secret apa pun yang dikonfigurasi: terima (mode dev) — pasang secret sebelum production.

  const saweriaId = typeof body?.id === "string" ? body.id : ""
  const amount = Math.max(0, Math.min(Number(body?.amount_raw) || 0, MAX_AMOUNT))
  const name = sanitizeName(body?.donator_name) || "Hamba Allah"
  const message = typeof body?.message === "string" ? body.message.slice(0, 200) : ""
  const date =
    typeof body?.created_at === "string" && body.created_at
      ? body.created_at
      : new Date().toISOString()

  const donations = await listDonations()

  // Idempotency: Saweria bisa retry — jangan catat dobel
  if (saweriaId && donations.some((d) => d.saweriaId === saweriaId)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  donations.push({
    id: saweriaId ? `saweria_${saweriaId.slice(0, 8)}_${Date.now()}` : `saweria_${Date.now()}`,
    name,
    amount,
    date,
    status: "verified",
    source: "saweria",
    saweriaId: saweriaId || undefined,
    message: message || undefined,
  })
  await saveDonations(donations)

  return NextResponse.json({ ok: true, name, amount })
}
