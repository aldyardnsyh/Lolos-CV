import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Poppins } from "next/font/google"
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
  title: "LolosCV - Buat CV yang Lolos Seleksi ATS",
  description: "Buat CV ATS-friendly yang menyesuaikan dengan lowongan target. Tempel link lowongan, analisis persyaratannya, dan optimalkan skor ATS CV kamu.",
  keywords: ["pembuat cv", "cv builder", "cv ATS", "ATS friendly", "CV online", "resume builder", "lowongan kerja", "optimasi CV"],
  authors: [{ name: "LolosCV" }],
  openGraph: {
    title: "LolosCV - Buat CV yang Lolos Seleksi ATS",
    description: "Buat CV ATS-friendly yang menyesuaikan dengan lowongan target. Tempel link lowongan, analisis persyaratannya, dan optimalkan skor ATS CV kamu.",
    type: "website",
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
          __html: `try{var t=localStorage.getItem("theme");if(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)t="dark";if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}`
        }} />
      </head>
      <body className={`${jakarta.variable} ${poppins.variable} min-h-screen`}>
        <a href="#main" className="skip-link">Langsung ke konten utama</a>
        {children}
      </body>
    </html>
  )
}
