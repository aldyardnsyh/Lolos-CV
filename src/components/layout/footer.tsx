"use client"

import Image from "next/image"
import Link from "next/link"

export function Footer() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative">
                <Image
                  src="/icon.png"
                  alt="Logo LolosCV"
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-9 w-9 rounded-xl"
                />
              </div>
              <span className="text-xl font-bold">
                Lolos<span className="text-primary">CV</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              Platform pembuatan CV yang membantu kamu lolos seleksi ATS.
              Analisis lowongan, optimalkan skor, dan buat CV yang menonjol.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Fitur</h4>
            <ul className="space-y-3">
              {[
                { label: "CV Builder", id: "builder" },
                { label: "Job Analyzer", id: "job-analyzer" },
                { label: "ATS Optimizer", id: "ats-optimizer" },
                { label: "Template CV", id: "templates" },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => scrollTo(item.id)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Sumber Lowongan</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Tempel link lowongan dari platform ini ke Job Analyzer. Paling andal dari halaman lowongan aslinya.
              Kalau satu platform memblokir akses otomatis, pakai tombol Tempel Teks.
            </p>
            <ul className="space-y-3">
              {[
                { name: "LinkedIn", url: "https://www.linkedin.com/jobs/" },
                { name: "JobStreet", url: "https://id.jobstreet.com/id/jobs" },
                { name: "Glints", url: "https://glints.com/id/lowongan-kerja" },
                { name: "Indeed Indonesia", url: "https://id.indeed.com/" },
                { name: "MagangHub Kemnaker", url: "https://maganghub.kemnaker.go.id/" },
                { name: "KarierHub Kemnaker", url: "https://karierhub.kemnaker.go.id/" },
              ].map((item) => (
                <li key={item.name}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PogungSoftwareHouseTeam (PSHT). All rights reserved.
          </p>
          {/* TODO: tambahkan email kontak & sosial media asli di sini setelah tersedia */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { href: "/contoh-cv-ats", label: "Contoh CV ATS" },
              { href: "/template-cv-ats", label: "Template CV ATS" },
              { href: "/cv-ats-friendly", label: "Panduan ATS" },
              { href: "/contoh-surat-lamaran", label: "Contoh Surat Lamaran" },
              { href: "/faq", label: "FAQ" },
              { href: "/tentang", label: "Tentang" },
              { href: "/privacy", label: "Kebijakan Privasi" },
              { href: "/terms", label: "Ketentuan" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
