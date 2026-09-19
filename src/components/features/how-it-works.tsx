"use client"

import { Search, Settings, FileText, BarChart3, ArrowDown } from "lucide-react"

const steps = [
  {
    icon: Settings,
    title: "1. Hubungkan API",
    description: "Pakai API key dari penyedia yang kamu punya. Data tetap di browser, tidak ke server kami.",
    color: "bg-primary",
  },
  {
    icon: Search,
    title: "2. Analisis Lowongan",
    description: "Tempel URL dari LinkedIn, JobStreet, atau Glints. Persyaratannya terurai otomatis.",
    color: "bg-primary",
  },
  {
    icon: FileText,
    title: "3. Buat CV",
    description: "Isi data diri dan pengalaman. Kontennya menyesuaikan dengan kebutuhan posisi itu.",
    color: "bg-primary",
  },
  {
    icon: BarChart3,
    title: "4. Optimasi & Unduh",
    description: "Lihat skor ATS, perbaiki bagian yang kurang, lalu unduh PDF siap kirim.",
    color: "bg-primary",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full pointer-events-none" />

      <div className="container relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Cara Kerjanya{" "}
            <span className="text-primary">
              Sederhana
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">
            4 langkah, dari lowongan sampai resume siap kirim.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className={`p-4 rounded-2xl ${step.color} text-white shadow-xl mb-6 relative z-10`}>
                  <step.icon className="w-8 h-8" />
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[calc(100%-1rem)]">
                    <div className="border-t-2 border-dashed border-primary/30" />
                    <ArrowDown className="w-4 h-4 text-primary/30 -mt-2.5 ml-auto rotate-[-90deg]" />
                  </div>
                )}

                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
