import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Poppins } from "next/font/google"
import { SITE_URL } from "@/lib/site"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
})

// Structured data (invisible, SEO only — tidak mengubah tampilan/fungsi).
const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LolosCV",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: ["id", "en"],
  description:
    "Buat CV ATS-friendly berbahasa Indonesia/Inggris yang menyesuaikan dengan lowongan target. Tempel link lowongan, analisis persyaratannya, optimasi skor ATS, export PDF — gratis tanpa batas.",
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
  ],
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LolosCV",
  url: SITE_URL,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LolosCV - Buat CV yang Lolos Seleksi ATS (Gratis)",
    template: "%s | LolosCV",
  },
  description:
    "Buat CV ATS-friendly berbahasa Indonesia/Inggris yang menyesuaikan dengan lowongan target. Tempel link lowongan, analisis persyaratannya, optimasi skor ATS, export PDF — gratis tanpa batas.",
  keywords: [
    "pembuat cv", "buat cv online", "cv builder indonesia", "cv ATS",
    "ATS friendly", "CV online gratis", "resume builder", "contoh CV ATS",
    "cara lolos seleksi ATS", "optimasi CV", "template CV ATS",
  ],
  authors: [{ name: "PogungSoftwareHouseTeam (PSHT)" }],
  creator: "PogungSoftwareHouseTeam (PSHT)",
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
  verification: {
    google: "Ai-p-D3AGFVyuCGUzkaR4lWV0eHq0a3bjJEgnlJIG5Y",
  },
  openGraph: {
    title: "LolosCV - Buat CV yang Lolos Seleksi ATS (Gratis)",
    description:
      "Tempel link lowongan, analisis persyaratan dengan AI, dan hasilkan CV ATS-friendly siap export PDF.",
    url: SITE_URL,
    siteName: "LolosCV",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LolosCV - Buat CV yang Lolos Seleksi ATS (Gratis)",
    description:
      "Tempel link lowongan, analisis persyaratan dengan AI, dan hasilkan CV ATS-friendly siap export PDF.",
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
        {children}
      </body>
    </html>
  )
}
