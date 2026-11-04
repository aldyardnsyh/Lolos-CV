import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Template CV ATS-Friendly Gratis - 4 Pilihan Siap Pakai",
  description:
    "4 template CV ATS-friendly LolosCV: ATS Classic, ATS + Foto, Creative, dan Modern Minimal. Lihat kapan masing-masing paling cocok dipakai.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Template CV ATS",
      item: `${SITE_URL}/template-cv-ats`,
    },
  ],
}

const templates = [
  {
    name: "ATS Classic",
    desc: "Satu kolom hitam putih bersih dengan gaya korporat klasik. Template default LolosCV.",
    kapan:
      "Melamar di korporat besar, BUMN, bank, atau instansi yang proses seleksinya ketat dan formal. Juga pilihan teraman kalau kamu ragu mau pilih yang mana.",
    kelebihan: [
      "Format paling aman di mata ATS karena tidak ada elemen visual yang bisa mengacaukan pembacaan teks.",
      "Nada formal dan bersih, pas dengan budaya lamaran korporat Indonesia.",
      "Urutan section bisa digeser dan section tertentu bisa disembunyikan sesuai kebutuhan lamaran.",
    ],
    catatan:
      "Kalau lowongan tidak menyebut permintaan khusus apa pun, gunakan template ini. Untuk BUMN dan bank, tetap pakai ATS Classic walau bidangmu kreatif.",
  },
  {
    name: "ATS + Foto",
    desc: "Satu kolom ramah ATS dengan slot pas foto 2x3 di pojok kiri atas.",
    kapan:
      "Banyak perusahaan dan instansi di Indonesia meminta pas foto di CV. Kalau lowongannya menyebut foto, pakai template ini tanpa mengorbankan keterbacaan mesin.",
    kelebihan: [
      "Foto berada di area terpisah, teks inti CV tetap satu kolom penuh dan rapi dibaca mesin.",
      "Tetap ramah ATS seperti ATS Classic karena struktur teksnya sama.",
      "Sekali upload foto, langsung tampil di preview dan PDF akhir.",
    ],
    catatan:
      "Gunakan foto formal berlatar polos dengan pakaian sopan. Kalau lowongan tidak minta foto, ATS Classic saja sudah cukup.",
  },
  {
    name: "Creative",
    desc: "Blok warna, tag skill, dan tampilan berani untuk dunia kreatif.",
    kapan:
      "Industri kreatif seperti desain, konten, social media, dan agensi. Tempat yang lebih menghargai kepribadian visual daripada format klasik.",
    kelebihan: [
      "Tag skill membuat keahlian utamamu terlihat sekali lirik oleh reviewer manusia.",
      "Blok warna membantu struktur CV terbaca cepat tanpa jadi tabel yang membingungkan mesin.",
      "Info inti tetap mengalir satu kolom sehingga tidak kacau saat di-parse.",
    ],
    catatan:
      "Jangan pakai untuk korporasi besar dan BUMN yang hampir selalu memakai ATS ketat, kembali ke ATS Classic untuk mereka. Tetap kirim portofolio atau link karya terpisah bila diminta.",
  },
  {
    name: "Modern Minimal",
    desc: "Gaya timeline yang bersih dengan tipografi modern.",
    kapan:
      "Startup dan perusahaan teknologi yang budayanya modern tapi tetap memakai ATS atau portal pelamar untuk saringan awal.",
    kelebihan: [
      "Tampilan timeline membuat progres karier mudah diikuti dari atas ke bawah.",
      "Terasa modern tanpa mengorbankan struktur teks satu kolom.",
      "Cocok dipadukan dengan kata kunci teknologi yang kamu angkat dari lowongan.",
    ],
    catatan:
      "Tetap satu kolom sehingga aman dibaca mesin. Tapi untuk BUMN dan institusi formal, ATS Classic tetap pilihan yang lebih pas.",
  },
]

const quickPick = [
  { situasi: "Lamar ke BUMN, bank, atau korporat besar", pilih: "ATS Classic" },
  { situasi: "Lowongan minta pas foto 2x3", pilih: "ATS + Foto" },
  { situasi: "Agensi kreatif atau portofolio visual", pilih: "Creative" },
  { situasi: "Startup dan perusahaan teknologi", pilih: "Modern Minimal" },
]

export default function TemplateCvAtsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />
      <main id="main">
        <article className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Beranda
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-foreground">Template CV ATS</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Gratis, tanpa watermark
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            4 Template CV ATS-Friendly Gratis
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            ATS Classic, ATS + Foto, Creative, dan Modern Minimal. Semua satu kolom berbasis teks,
            semua gratis, langsung bisa dipakai di builder tanpa akun.
          </p>

          <div className="mt-8 space-y-4 leading-relaxed text-muted-foreground">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Kenapa format satu kolom text-based menang di ATS
            </h2>
            <p>
              ATS membaca lamaranmu sebagai teks, bukan sebagai gambar. Sistem ini mencari heading,
              tanggal, dan isi CV untuk dipetakan ke kolom profil kandidat. Artinya keputusan
              template-mu bukan soal selera, tapi soal apakah teks CV-mu bisa dibaca dengan urutan
              yang benar.
            </p>
            <p>
              Template berkolom ganda, text box, ikon di info inti, dan grafis dekoratif sering
              membuat urutan teks kacau saat dibaca mesin: nama bisa tercampur dengan tanggal, skill
              terpotong, atau bagian penting tidak terbaca sama sekali. Keindahan desain tidak
              ditanyakan oleh mesin, keterbacaan yang dinilai.
            </p>
            <p>
              Keempat template LolosCV dibuat satu kolom dan berbasis teks sejak awal, jadi urutan
              bacanya selalu rapi di mata ATS. Bedanya hanya tingkat gaya: dari formal klasik sampai
              modern dengan sentuhan visual.
            </p>
          </div>

          <h2 className="mt-14 mb-2 font-display text-2xl font-bold md:text-3xl">
            Kenalan dengan 4 template-nya
          </h2>
          <div className="mt-6 space-y-6">
            {templates.map((t) => (
              <Card key={t.name}>
                <CardHeader>
                  <CardTitle className="font-display text-xl">{t.name}</CardTitle>
                  <CardDescription>{t.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-foreground">Kapan pakai</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t.kapan}</p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-foreground">Kelebihan</p>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                      {t.kelebihan.map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-foreground">Catatan ATS</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t.catatan}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            Cara cepat memilih dalam 10 detik
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 text-left font-semibold text-foreground">
                    Situasimu
                  </th>
                  <th className="py-3 text-left font-semibold text-foreground">Pilih template</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {quickPick.map((row) => (
                  <tr key={row.situasi} className="border-b border-border/60">
                    <td className="py-3 pr-4 leading-relaxed">{row.situasi}</td>
                    <td className="py-3 font-medium text-foreground">{row.pilih}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            Fitur builder yang menjaga keterbacaan ATS
          </h2>
          <div className="space-y-4 leading-relaxed text-muted-foreground">
            <p>
              Pemilihan template hanya separuh cerita. Di dalam builder LolosCV ada beberapa fitur
              yang membantu CV-mu tetap rapi di mata mesin, apa pun template yang kamu pilih:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold text-foreground">Urutan section bisa digeser.</strong>{" "}
                Kalau lowongan lebih mengutamakan skill daripada pendidikan, pindahkan skill ke atas
                tanpa merusak struktur heading-nya.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Section bisa disembunyikan.</strong>{" "}
                Fresh graduate tanpa pengalaman profesional bisa menyembunyikan bagian itu dan
                mengandalkan organisasi serta proyek.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Dua bahasa sekali klik.</strong>{" "}
                Seluruh CV dan label section tersedia dalam bahasa Indonesia dan Inggris, tinggal
                mengikuti bahasa lowongan.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Preview langsung saat mengedit.</strong>{" "}
                Perubahan terlihat seketika, jadi kamu bisa mengecek panjang CV sebelum mengunduh
                PDF tanpa watermark.
              </li>
            </ul>
            <p>
              Kombinasi template satu kolom dan kontrol ini membuat CV-mu konsisten ramah ATS dari
              struktur sampai hasil akhirnya.
            </p>
          </div>
        </article>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              Pilih template, langsung isi CV-nya
            </h2>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">
              Semua template di atas bisa dipakai gratis di builder LolosCV, tanpa akun dan tanpa
              watermark saat mengunduh PDF.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/#builder" className={cn(buttonVariants({ size: "lg" }))}>
                Buka Builder CV
              </Link>
              <Link
                href="/contoh-cv-ats"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Lihat contoh per profesi
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Belum paham cara kerja mesin penyaring lamaran? Baca{" "}
              <Link href="/cv-ats-friendly" className="font-medium text-primary hover:underline">
                panduan CV ATS-friendly
              </Link>
              , atau kembali ke{" "}
              <Link href="/" className="font-medium text-primary hover:underline">
                halaman depan
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
