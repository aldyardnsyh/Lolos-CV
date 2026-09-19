"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, Sparkles, Heart, Copy, CheckCircle2, Trophy, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const freeFeatures = [
  "Semua template CV (ATS Classic, ATS + Foto, Creative, Modern Minimal)",
  "Analisis lowongan tanpa batas",
  "Penulisan & optimasi konten",
  "ATS score check",
  "Export PDF",
  "Tidak ada masa percobaan",
]

const SAWERIA_URL = "https://saweria.co/pogungsoftwarehouse"
const SAWERIA_USERNAME = "pogungsoftwarehouse"

interface Donor {
  rank: number
  name: string
  amount: number
}

const MEDALS = ["🥇", "🥈", "🥉"]

export function Pricing() {
  const [copied, setCopied] = useState(false)
  const [donors, setDonors] = useState<Donor[]>([])
  const [totalDonation, setTotalDonation] = useState(0)
  const [loadingDonors, setLoadingDonors] = useState(true)

  const loadDonors = useCallback(async () => {
    try {
      const res = await fetch("/api/donations")
      const data = await res.json()
      if (res.ok) {
        setDonors(data.donors || [])
        setTotalDonation(data.total || 0)
      }
    } catch {} finally {
      setLoadingDonors(false)
    }
  }, [])

  useEffect(() => { loadDonors() }, [loadDonors])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

      <div className="container relative max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            <span className="text-primary">
              Gratis
            </span>{" "}
            untuk Semua
          </h2>
          <p className="text-muted-foreground text-lg">
            Platform gratis. Semua fitur bisa dipakai tanpa biaya.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KIRI: Gratis + Donasi Saweria */}
          <div className="space-y-6">
            <Card className="border-primary/50 shadow-xl shadow-primary/10 overflow-hidden">
              <div className="h-2 w-full bg-primary" />
              <CardHeader className="pt-6 text-center">
                <div className="flex justify-center mb-3">
                  <Badge className="px-4 py-1 gap-1 bg-primary text-white border-0 shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Tanpa Batas Fitur
                  </Badge>
                </div>
                <div>
                  <span className="text-4xl font-bold">Rp 0</span>
                  <span className="text-muted-foreground text-sm ml-2">selamanya, tanpa syarat</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-w-md mx-auto pb-2">
                {freeFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="p-0.5 rounded-full text-primary">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      Dukung Pengembangan
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Opsional</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Kalau aplikasi ini membantumu, donasi sekecil apa pun berarti untuk biaya server dan pengembangan.
                    </p>
                  </div>
                </div>

                <a
                  href={SAWERIA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
                >
                  <Heart className="w-4 h-4" />
                  Donasi via Saweria
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div>
                  <p className="text-xs font-semibold mb-1">Username Saweria</p>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="text-sm font-medium truncate">{SAWERIA_USERNAME}</span>
                    <button
                      onClick={() => handleCopy(SAWERIA_URL)}
                      className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
                      aria-label="Salin link Saweria"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bisa via QRIS, GoPay, OVO, DANA, dan bank. Leaderboard terupdate otomatis setelah donasi masuk — tanpa verifikasi manual.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* KANAN: Leaderboard Top Donatur */}
          <Card className="border-border/50 h-fit lg:sticky lg:top-24">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Top Donatur
                  </CardTitle>
                  <CardDescription>Terupdate otomatis dari Saweria</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {totalDonation > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalDonation)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">total donasi terkumpul</p>
                </div>
              )}

              {loadingDonors ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : donors.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada donatur.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Jadilah yang pertama!</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {donors.map((d) => (
                    <li
                      key={d.rank}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${d.rank === 1 ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-muted/40 border-border/50"}`}
                    >
                      <span className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold shrink-0 bg-card border border-border shadow-sm">
                        {d.rank <= 3 ? MEDALS[d.rank - 1] : d.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.name}</p>
                      </div>
                      {d.amount > 0 && (
                        <span className="text-xs font-semibold text-primary shrink-0">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(d.amount)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-[11px] text-muted-foreground text-center">
                Berapapun nilainya, sangat berharga. Terima kasih sudah ikut membangun LolosCV.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
