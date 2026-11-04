"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Sparkles, FileText, Target, TrendingUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const MAGANGHUB_BANNER_KEY = "maganghub_banner_dismissed"

export function Hero() {
  const [showCampaignBanner, setShowCampaignBanner] = useState(false)

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MAGANGHUB_BANNER_KEY) !== "1") {
        setShowCampaignBanner(true)
      }
    } catch {}
  }, [])

  const dismissCampaignBanner = () => {
    setShowCampaignBanner(false)
    try {
      window.localStorage.setItem(MAGANGHUB_BANNER_KEY, "1")
    } catch {}
  }

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container relative">
        {showCampaignBanner && (
          <div className="max-w-4xl mx-auto mb-10 animate-fade-up">
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 dark:bg-primary/20 px-4 py-3 pr-10 sm:pr-12">
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm sm:text-[15px] leading-relaxed text-foreground">
                  🎯 Lagi siap daftar <span className="font-semibold">Magang Kemnaker Batch 3</span>? Bikin CV yang benar-benar dibaca — gratis, tanpa akun, langsung dari HP.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Info resmi pendaftaran:{" "}
                  <a
                    href="https://maganghub.kemnaker.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    maganghub.kemnaker.go.id
                  </a>
                </p>
              </div>
              <Button size="sm" className="shrink-0 gap-1.5" onClick={() => scrollTo("builder")}>
                Buat CV-nya Sekarang
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <button
                type="button"
                onClick={dismissCampaignBanner}
                aria-label="Tutup banner kampanye"
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6 animate-fade-up">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Gratis Rp 0 · Tanpa Akun · Tanpa Watermark
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display leading-tight mb-6 animate-fade-up">
            CV Ramah ATS,{" "}
            <span className="block text-primary">
              Dibuat 15 Menit, Gratis Rp 0
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up">
            Tempel link lowongan dari LinkedIn, JobStreet, atau Glints — LolosCV
            bantu susun CV yang menjawab kebutuhan lowongan itu. Semua fitur
            utama gratis Rp 0, tanpa daftar akun, unduh PDF tanpa watermark.
            Fitur AI opsional pakai kunci milikmu sendiri, ada panduannya, atau
            pakai mode demo dulu.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up">
            <Button
              size="xl"
              className="w-full sm:w-auto gap-2 text-base"
              onClick={() => scrollTo("builder")}
            >
              Mulai Buat Resume
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="w-full sm:w-auto gap-2 text-base"
              onClick={() => {
                scrollTo("builder")
                window.dispatchEvent(new CustomEvent("demo_generate"))
              }}
            >
              <Sparkles className="w-5 h-5" />
              Coba Tanpa API Key (Gratis)
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="w-full sm:w-auto gap-2 text-base"
              onClick={() => scrollTo("how-it-works")}
            >
              Lihat Cara Kerja
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto animate-fade-up">
            {[
              { icon: FileText, label: "CV Sesuai Lowongan", desc: "Bukan template generic" },
              { icon: Target, label: "Analisis Otomatis", desc: "Key point terdeteksi" },
              { icon: TrendingUp, label: "Skor ATS Tertarget", desc: "Fokus yang diminta HRD" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
