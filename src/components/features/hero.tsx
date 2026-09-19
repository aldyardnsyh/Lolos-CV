"use client"

import { ArrowRight, Sparkles, FileText, Target, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Hero() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6 animate-fade-up">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Resume ATS-Friendly · Analisis Lowongan · Optimasi Skor
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-6 animate-fade-up">
            Buat CV yang{" "}
            <span className="text-primary">
              Lolos Seleksi ATS
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up">
            Tempel link lowongan dari LinkedIn, JobStreet, atau Glints. CV kamu
            langsung menyesuaikan dengan kriterianya, bukan sekadar template satu ukuran.
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
