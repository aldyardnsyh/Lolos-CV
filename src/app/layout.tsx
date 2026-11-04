import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Poppins } from "next/font/google"
import { SITE_URL } from "@/lib/site"
import { SEO_PAGES } from "@/lib/seo/pages"
import "./globals.css"

// Entri landing di registry SEO: satu sumber untuk title & description utama.
const LANDING = SEO_PAGES[0]

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

// Poppins hanya dipakai di class font-display (heading) dengan weight 600
// (font-semibold, termasuk default CardTitle) dan 700 (font-bold). Weight lain
// dihapus agar tidak membebani load font (CWV, docs/seo-plan-2026-11.md S2).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

// Structured data (invisible, SEO only. Tidak mengubah tampilan/fungsi).
const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LolosCV",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: ["id", "en"],
  description: LANDING.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Apa itu CV ATS-friendly?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CV ATS-friendly adalah CV dengan struktur dan kata kunci yang bisa dibaca sistem Applicant Tracking System (ATS) perusahaan, sehingga tidak gugur sebelum dibaca HRD.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah LolosCV gratis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya, LolosCV gratis tanpa batas untuk membuat, mengoptimasi skor ATS, dan export PDF.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah bisa bahasa Indonesia dan Inggris?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Bisa. LolosCV mendukung CV berbahasa Indonesia dan Inggris yang disesuaikan dengan lowongan target.",
      },
    },
    {
      "@type": "Question",
      name: "Bagaimana cara optimasi skor ATS?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tempel link lowongan target, LolosCV menganalisis persyaratan lowongan lalu menyarankan kata kunci dan perbaikan struktur agar skor ATS naik.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah bisa export PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Bisa. Hasil CV ATS-friendly bisa langsung di-export ke PDF siap kirim ke perusahaan.",
      },
    },
    {
      "@type": "Question",
      name: "LolosCV benar-benar gratis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya. Semua fitur utama Rp 0, tanpa trial, tanpa watermark, tanpa kartu kredit. Kalau terbantu, donasi via Saweria sepenuhnya opsional.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah LolosCV bagian dari Kemnaker atau MagangHub?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tidak. LolosCV independen dan tidak berafiliasi dengan Kemnaker maupun MagangHub. Untuk info resmi pendaftaran magang, selalu cek maganghub.kemnaker.go.id. LolosCV hanya membantu menyiapkan CV-nya.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah CV saya bisa diunduh gratis sebagai PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya, tanpa watermark dan tanpa batas unduhan. Tips: di dialog yang muncul, pilih tujuan \"Save as PDF / Simpan sebagai PDF\".",
      },
    },
    {
      "@type": "Question",
      name: "Apakah datanya aman?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CV-mu tersimpan di browser perangkatmu. Saat kamu pakai fitur AI opsional, isi CV diteruskan sekali lewat server kami ke penyedia AI pilihanmu, tidak disimpan, tidak dicatat. Rincian lengkap ada di halaman Kebijakan Privasi kami.",
      },
    },
    {
      "@type": "Question",
      name: "Perlu akun?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tidak perlu. Buka, isi, unduh. Data tersimpan otomatis di browser-mu (jangan bersihkan riwayat/browser di perangkat itu sebelum unduh atau simpan file proyek).",
      },
    },
    {
      "@type": "Question",
      name: "Saya fresh graduate tanpa pengalaman kerja, cocok?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cocok. Ada contoh CV khusus fresh graduate (organisasi, magang, proyek), dan fitur analisis lowongan membantu menyesuaikan CV dengan persyaratan yang ditulis perusahaan.",
      },
    },
  ],
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LolosCV",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LolosCV",
  alternateName: "LolosCV ATS",
  url: SITE_URL,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: LANDING.title,
    template: "%s | LolosCV",
  },
  description: LANDING.description,
  authors: [{ name: "PogungSoftwareHouseTeam (PSHT)" }],
  creator: "PogungSoftwareHouseTeam (PSHT)",
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
  verification: {
    google: "Ai-p-D3AGFVyuCGUzkaR4lWV0eHq0a3bjJEgnlJIG5Y",
  },
  openGraph: {
    title: LANDING.title,
    description:
      "Tempel link lowongan, susun CV yang menjawab persyaratannya. Gratis Rp 0, tanpa akun, unduh PDF tanpa watermark.",
    url: SITE_URL,
    siteName: "LolosCV",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING.title,
    description:
      "Tempel link lowongan, susun CV yang menjawab persyaratannya. Gratis Rp 0, tanpa akun, unduh PDF tanpa watermark.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`
        }} />
      </head>
      <body className={`${jakarta.variable} ${poppins.variable} min-h-screen`}>
        <a href="#main" className="skip-link">Langsung ke konten utama</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
