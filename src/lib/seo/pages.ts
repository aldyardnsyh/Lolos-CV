// Registry halaman SEO: satu sumber untuk sitemap, metadata, dan internal link.
// lastmod statis/manual (bukan new Date()) agar sitemap stabil antar build.
// Aturan copy: tanpa em dash, semua Bahasa Indonesia.
export interface SeoPageEntry {
  slug: string
  title: string
  description: string
  /** Tanggal modifikasi terakhir, format YYYY-MM-DD. */
  lastmod: string
  priority: number
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
}

export const SEO_PAGES: SeoPageEntry[] = [
  {
    slug: "/",
    title: "LolosCV - Bikin CV ATS-Friendly Gratis, Tanpa Akun dan Watermark",
    description:
      "Bikin CV profesional gratis Rp 0, tanpa daftar akun, unduh PDF tanpa watermark. Tempel link lowongan LinkedIn, JobStreet, atau Glints dan CV disesuaikan dengan persyaratannya.",
    lastmod: "2026-11-04",
    priority: 1,
    changeFrequency: "weekly",
  },
  {
    slug: "/contoh-cv-ats",
    title: "Contoh CV ATS-Friendly per Profesi - Gratis, Bisa Dicopy",
    description:
      "Kumpulan contoh CV ATS-friendly yang bisa langsung dicopy: admin, fresh graduate, logistics, marketing, dan IT. Lengkap dengan penjelasan kenapa strukturnya demikian.",
    lastmod: "2026-11-04",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    slug: "/template-cv-ats",
    title: "Template CV ATS-Friendly Gratis - 4 Pilihan Siap Pakai",
    description:
      "4 template CV ATS-friendly LolosCV: ATS Classic, ATS + Foto, Creative, dan Modern Minimal. Lihat kapan masing-masing paling cocok dipakai.",
    lastmod: "2026-11-04",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    slug: "/cv-ats-friendly",
    title: "Panduan CV ATS-Friendly: Apa Itu ATS dan Cara Lolos Screening",
    description:
      "Panduan lengkap CV ATS-friendly dalam bahasa awam: apa itu ATS, checklist 10 poin, do dan dont, serta miskonsepsi soal skor ATS.",
    lastmod: "2026-11-04",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    slug: "/privacy",
    title: "Kebijakan Privasi LolosCV",
    description:
      "Data CV disimpan di browser; permintaan AI lewat server sekali lewat tanpa disimpan; tanpa pelacakan.",
    lastmod: "2026-11-04",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    slug: "/terms",
    title: "Ketentuan Penggunaan LolosCV",
    description:
      "Ketentuan penggunaan LolosCV: gratis apa adanya, tanggung jawab isi CV pada pengguna, tanpa jaminan hasil lamaran.",
    lastmod: "2026-11-04",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    slug: "/faq",
    title: "FAQ LolosCV",
    description:
      "Pertanyaan yang sering ditanyakan tentang LolosCV: gratis, privasi, pindah perangkat, mode demo, dan cara kerja AI.",
    lastmod: "2026-11-04",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    slug: "/tentang",
    title: "Tentang LolosCV",
    description:
      "LolosCV dikembangkan PSHT untuk membantu orang membuat CV ATS-friendly gratis Rp 0, tanpa akun, tanpa watermark.",
    lastmod: "2026-11-04",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    slug: "/contoh-surat-lamaran",
    title: "Contoh Surat Lamaran Kerja - Format Indonesia, Siap Copy",
    description:
      "Struktur dan 2 contoh surat lamaran kerja format Indonesia yang bisa langsung dicopy, plus cara membuatnya otomatis dari CV.",
    lastmod: "2026-11-04",
    priority: 0.6,
    changeFrequency: "monthly",
  },
]

/** URL absolut kanonis dari slug registry (homepage tetap tanpa trailing slash). */
export function seoPageUrl(slug: string, siteUrl: string): string {
  const path = slug === "/" ? "" : slug
  return `${siteUrl}${path}`
}
