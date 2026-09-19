"use client"

import {
  FileText, Search, BarChart3, Zap, Shield, Layers, Link2, Brain,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: FileText,
    title: "CV Builder",
    description: "Pilih template, isi data, dapatkan CV yang siap dikirim. Hasilnya bukan copy-paste, tapi tiap bagian disesuaikan dengan target lowongan yang kamu pilih.",
    color: "bg-primary",
  },
  {
    icon: Link2,
    title: "Job Link Analyzer",
    description: "Cukup tempel URL lowongan dari LinkedIn, JobStreet, atau Glints. Persyaratan dan kualifikasinya terurai otomatis.",
    color: "bg-blue-600",
  },
  {
    icon: Brain,
    title: "Key Point Matching",
    description: "CV kamu dibandingkan dengan tiap poin penting di lowongan. Tahu persis bagian mana yang kurang dan perlu diperkuat.",
    color: "bg-orange-600",
  },
  {
    icon: BarChart3,
    title: "ATS Score Check",
    description: "Dapatkan skor dan rekomendasi konkret, bukan tebakan. Tiap saran langsung bisa diterapkan tanpa perlu ngecek ulang.",
    color: "bg-emerald-600",
  },
  {
    icon: Search,
    title: "Keyword Detection",
    description: "Kata kunci yang dicari HRD teridentifikasi otomatis. CV kamu tetap terbaca natural, bukan sekadar tempel keyword.",
    color: "bg-violet-600",
  },
  {
    icon: Layers,
    title: "Multi-Template",
    description: "Empat pilihan template, dari yang paling formal sampai kreatif. Semuanya tetap terbaca mesin ATS.",
    color: "bg-rose-600",
  },
  {
    icon: Zap,
    title: "Konten Teroptimasi",
    description: "Kalau mentok nyari kata, deskripsi pengalaman dan ringkasan profesional bisa ditulis ulang agar lebih berdampak.",
    color: "bg-amber-600",
  },
  {
    icon: Shield,
    title: "Privasi Terjaga",
    description: "API key kamu cuma ada di browser sendiri. Data tidak dikirim ke server kami. Kami tidak lihat isi CV kamu.",
    color: "bg-indigo-600",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="container relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            CV yang{" "}
            <span className="text-primary">
              Tepat Sasaran
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Tiap lamaran beda. Resume kamu pun harus beda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={feature.title} className="group hover:shadow-lg hover:-translate-y-1 cursor-default border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className={`p-3 w-fit rounded-2xl ${feature.color} text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
