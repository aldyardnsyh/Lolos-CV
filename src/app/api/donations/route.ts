import { NextRequest, NextResponse } from "next/server"
import {
  listDonations,
  saveDonations,
  sanitizeName,
  isAdminAuthorized,
  pruneDonations,
  MAX_AMOUNT,
} from "@/lib/donations-store"
import { clientIp, rateLimit } from "@/lib/rate-limit"

// Leaderboard donasi — terisi OTOMATIS dari webhook Saweria
// (/api/saweria-webhook, status "verified") + form manual (status "pending"
// sampai diverifikasi admin). Peringkat diagregasi per nama donatur.

// GET /api/donations — leaderboard top 10 (agregasi total per donatur)
// GET /api/donations?admin=true&token=xxx — semua pending
export async function GET(request: NextRequest) {
  try {
    const isAdmin = request.nextUrl.searchParams.get("admin") === "true"
    const token = request.nextUrl.searchParams.get("token") || ""
    const donations = await listDonations()

    if (isAdmin) {
      if (!isAdminAuthorized(token)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.json({ pending: donations.filter((d) => d.status === "pending") })
    }

    const verified = donations.filter((d) => d.status === "verified")

    // Agregasi: satu nama = satu peringkat (total semua donasinya).
    // Nominal 0 tidak ikut peringkat maupun total (noise).
    const byDonor = new Map<string, { name: string; amount: number; id: string; count: number }>()
    for (const d of verified) {
      if (!(d.amount > 0)) continue
      const key = d.name.trim().toLowerCase()
      if (!key) continue
      const cur = byDonor.get(key)
      if (cur) {
        cur.amount += d.amount
        cur.count += 1
        cur.id = d.id
      } else {
        byDonor.set(key, { name: d.name.trim(), amount: d.amount, id: d.id, count: 1 })
      }
    }

    const donors = Array.from(byDonor.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((d, i) => ({ rank: i + 1, id: d.id, name: d.name, amount: d.amount, count: d.count }))

    return NextResponse.json({
      donors,
      total: verified.reduce((s, d) => s + (d.amount > 0 ? d.amount : 0), 0),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memuat data" }, { status: 500 })
  }
}

// POST /api/donations — submit nama (pending, alur manual/QRIS)
// POST /api/donations?token=xxx — verifikasi: body { id, token }
export async function POST(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") || ""

    // Verifikasi donasi (admin). Token salah / admin tak dikonfigurasi → 401,
    // bukan jatuh ke alur submit (mencegah probing).
    if (token) {
      if (!isAdminAuthorized(token)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const body = await request.json().catch(() => ({}))
      const id = typeof body?.id === "string" ? body.id.trim() : ""
      if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 })

      const donations = await listDonations()
      const idx = donations.findIndex((d) => d.id === id)
      if (idx === -1) return NextResponse.json({ error: "Donasi tidak ditemukan" }, { status: 404 })

      donations[idx].status = "verified"
      await saveDonations(donations)
      return NextResponse.json({ ok: true, name: donations[idx].name })
    }

    // Submit nama baru (pending). Rate limit anti-spam KV.
    const rl = rateLimit(`donations:${clientIp(request)}`, 10, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan, coba lagi dalam ${rl.retryAfterSec} detik` },
        { status: 429 }
      )
    }
    const body = await request.json().catch(() => ({}))
    const name = sanitizeName(body?.name)
    const amount = Math.max(0, Math.min(Number(body?.amount) || 0, MAX_AMOUNT))

    if (!name) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 })
    }

    const donations = await listDonations()
    const donation = {
      id: `don_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      amount,
      date: new Date().toISOString(),
      status: "pending" as const,
      source: "manual" as const,
    }
    donations.push(donation)
    await saveDonations(pruneDonations(donations))

    return NextResponse.json({ ok: true, id: donation.id, name: donation.name })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal menyimpan" }, { status: 500 })
  }
}

// DELETE /api/donations?token=xxx — hapus satu entri (moderasi nama iseng /
// ofensif di leaderboard publik). Body: { id }
export async function DELETE(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") || ""
    if (!isAdminAuthorized(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json().catch(() => ({}))
    const id = typeof body?.id === "string" ? body.id.trim() : ""
    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 })

    const donations = await listDonations()
    const idx = donations.findIndex((d) => d.id === id)
    if (idx === -1) return NextResponse.json({ error: "Donasi tidak ditemukan" }, { status: 404 })

    const [removed] = donations.splice(idx, 1)
    await saveDonations(donations)
    return NextResponse.json({ ok: true, name: removed.name })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal menghapus" }, { status: 500 })
  }
}
