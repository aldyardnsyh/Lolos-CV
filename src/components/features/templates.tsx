"use client"

import { Check, FileText, Palette, Layout, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const templates = [
  {
    name: "ATS Classic",
    description: "Single column, clean, dan mudah dibaca mesin ATS. Paling aman untuk melamar ke perusahaan besar.",
    color: "bg-blue-600",
    borderColor: "border-blue-500/30",
    accent: "bg-blue-50 dark:bg-blue-950/30",
    features: ["ATS Optimized", "Single Column", "Clean Text"],
  },
  {
    name: "ATS + Foto",
    description: "Tata letak satu kolom yang tetap ATS-friendly, dengan tempat foto di kiri atas.",
    color: "bg-slate-700",
    borderColor: "border-slate-500/30",
    accent: "bg-slate-50 dark:bg-slate-950/30",
    features: ["ATS Optimized", "Foto Profil", "Formal"],
  },
  {
    name: "Creative",
    description: "Blok warna penuh, skill tags, dan gaya tebal untuk industri kreatif seperti design dan media.",
    color: "bg-purple-600",
    borderColor: "border-purple-500/30",
    accent: "bg-purple-50 dark:bg-purple-950/30",
    features: ["Color Blocks", "Skill Tags", "Bold"],
  },
  {
    name: "Modern Minimal",
    description: "Pengalaman kerja dengan timeline dan tipografi bersih. Cocok untuk startup dan teknologi.",
    color: "bg-emerald-600",
    borderColor: "border-emerald-500/30",
    accent: "bg-emerald-50 dark:bg-emerald-950/30",
    features: ["Timeline", "Clean Typography", "Minimal"],
  },
]

export function Templates() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section id="templates" className="py-24">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Pilih{" "}
            <span className="text-primary">
              Template
            </span>{" "}
            Favoritmu
          </h2>
          <p className="text-muted-foreground text-lg">
            Semua template terbaca ATS, tinggal pilih yang paling pas dengan profilmu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template) => (
            <Card
              key={template.name}
              className={`group relative overflow-hidden cursor-default ${template.accent} ${template.borderColor} hover:shadow-xl transition-all duration-300`}
            >
              <div className={`h-3 w-full ${template.color}`} />

              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-xl ${template.color} text-white shadow-lg`}>
                    <Palette className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {template.features.map((feat) => (
                    <Badge key={feat} variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      {feat}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex -space-x-2">
                    {[Layout, FileText, Type].map((Icon, i) => (
                      <div
                        key={i}
                        className={`p-1.5 rounded-lg ${template.color} text-white shadow-md`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Fully customizable
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => scrollTo("builder")}
                >
                  Gunakan Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
