import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { buttonVariants } from "@/components/ui/button"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "FAQ LolosCV",
  description:
    "Pertanyaan yang sering ditanyakan tentang LolosCV: gratis, privasi, pindah perangkat, mode demo, dan cara kerja AI.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "FAQ",
      item: `${SITE_URL}/faq`,
    },
  ],
}

// 11 pertanyaan ini sama persis dengan FAQPage JSON-LD global di src/app/layout.tsx.
// Halaman ini sengaja TIDAK menambah blok FAQPage JSON-LD sendiri agar skema tidak duplikat.
const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "Apa itu CV ATS-friendly?",
    a: "CV ATS-friendly adalah CV dengan struktur dan kata kunci yang bisa dibaca sistem Applicant Tracking System (ATS) perusahaan, sehingga tidak gugur sebelum dibaca HRD.",
  },
  {
    q: "Apakah LolosCV gratis?",
    a: "Ya, LolosCV gratis tanpa batas untuk membuat, mengoptimasi skor ATS, dan export PDF.",
  },
  {
    q: "Apakah bisa bahasa Indonesia dan Inggris?",
    a: "Bisa. LolosCV mendukung CV berbahasa Indonesia dan Inggris yang disesuaikan dengan lowongan target.",
  },
  {
    q: "Bagaimana cara optimasi skor ATS?",
    a: "Tempel link lowongan target, LolosCV menganalisis persyaratan lowongan lalu menyarankan kata kunci dan perbaikan struktur agar skor ATS naik.",
  },
  {
    q: "Apakah bisa export PDF?",
    a: "Bisa. Hasil CV ATS-friendly bisa langsung di-export ke PDF siap kirim ke perusahaan.",
  },
  {
    q: "LolosCV benar-benar gratis?",
    a: "Ya. Semua fitur utama Rp 0, tanpa trial, tanpa watermark, tanpa kartu kredit. Kalau terbantu, donasi via Saweria sepenuhnya opsional.",
  },
  {
    q: "Apakah LolosCV bagian dari Kemnaker atau MagangHub?",
    a: "Tidak. LolosCV independen dan tidak berafiliasi dengan Kemnaker maupun MagangHub. Untuk info resmi pendaftaran magang, selalu cek maganghub.kemnaker.go.id. LolosCV hanya membantu menyiapkan CV-nya.",
  },
  {
    q: "Apakah CV saya bisa diunduh gratis sebagai PDF?",
    a: 'Ya, tanpa watermark dan tanpa batas unduhan. Tips: di dialog yang muncul, pilih tujuan "Save as PDF / Simpan sebagai PDF".',
  },
  {
    q: "Apakah datanya aman?",
    a: (
      <>
        CV-mu tersimpan di browser perangkatmu. Saat kamu pakai fitur AI opsional, isi CV diteruskan
        sekali lewat server kami ke penyedia AI pilihanmu, tidak disimpan, tidak dicatat. Rincian
        lengkap ada di halaman{" "}
        <Link href="/privacy" className="font-medium text-primary hover:underline">
          Kebijakan Privasi
        </Link>{" "}
        kami.
      </>
    ),
  },
  {
    q: "Perlu akun?",
    a: "Tidak perlu. Buka, isi, unduh. Data tersimpan otomatis di browser-mu (jangan bersihkan riwayat/browser di perangkat itu sebelum unduh atau simpan file proyek).",
  },
  {
    q: "Saya fresh graduate tanpa pengalaman kerja, cocok?",
    a: "Cocok. Ada contoh CV khusus fresh graduate (organisasi, magang, proyek), dan fitur analisis lowongan membantu menyesuaikan CV dengan persyaratan yang ditulis perusahaan.",
  },
  {
    q: "Bagaimana cara pindah CV ke perangkat lain?",
    a: "Gunakan tombol simpan data ke file di builder, lalu di perangkat baru pilih muat dari file. Gratis dan tanpa akun. Datamu tidak pernah ada di server, jadi file ini adalah cara resmi memindahkannya.",
  },
  {
    q: "Apakah bisa dipakai di HP?",
    a: "Ya. Builder dirancang untuk dipakai dari HP, dan tombol Cetak/Simpan PDF selalu tersedia di bagian bawah halaman. Untuk mengisi form yang panjang, laptop tetap lebih nyaman, tapi dari awal sampai unduh PDF bisa selesai di HP.",
  },
  {
    q: "Data saya hilang kalau ganti browser?",
    a: "Ya. Data CV tersimpan di browser tempat kamu mengisinya, bukan di server. Kalau berpindah browser atau perangkat, simpan data ke file dulu dari browser lama, lalu muat dari file di tempat baru.",
  },
]

export default function FaqPage() {
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
            <span className="text-foreground">FAQ</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            14 pertanyaan
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Pertanyaan yang Sering Ditanyakan
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Jawaban singkat untuk hal yang paling sering ditanyakan soal LolosCV: soal harga,
            privasi, cara kerja fitur AI (termasuk mode demo tanpa kunci API), dan memindahkan CV
            antar perangkat.
          </p>

          <div className="mt-10 space-y-10">
            {faqs.map((item, index) => (
              <section key={item.q} id={`q-${index + 1}`} className="scroll-mt-24">
                <h2 className="mb-3 font-display text-xl font-bold md:text-2xl">{item.q}</h2>
                <p className="leading-relaxed text-muted-foreground">{item.a}</p>
              </section>
            ))}
          </div>
        </article>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              Coba langsung, gratis
            </h2>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">
              Masih ada yang mau ditanyakan? Cara paling cepat menjawabnya adalah mencoba sendiri.
              Buka builder, isi, unduh. Tanpa akun, tanpa kartu kredit.
            </p>
            <Link href="/#builder" className={cn(buttonVariants({ size: "lg" }))}>
              Mulai buat CV sekarang
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
