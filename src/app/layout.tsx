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
        {children}
      </body>
    </html>
  )
}
