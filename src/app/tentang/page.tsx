import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { buttonVariants } from "@/components/ui/button"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Tentang LolosCV",
  description:
    "LolosCV dikembangkan PSHT untuk membantu orang membuat CV ATS-friendly gratis Rp 0, tanpa akun, tanpa watermark.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Tentang LolosCV",
      item: `${SITE_URL}/tentang`,
    },
  ],
}

export default function TentangPage() {
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
            <span className="text-foreground">Tentang LolosCV</span>
          </nav>

          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Tentang LolosCV
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            LolosCV adalah tool pembuat CV yang gratis Rp 0, tanpa akun, dan tanpa watermark. Halaman
            ini menjelaskan siapa yang membuatnya, kenapa gratis, dan apa yang tidak kami klaim.
          </p>

          <section id="siapa" className="mt-12 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              Siapa yang membuat LolosCV
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                LolosCV dikembangkan oleh PogungSoftwareHouseTeam (PSHT), sebuah tim pengembang
                perangkat lunak independen. LolosCV bukan produk perusahaan rekrutmen, bukan produk
                lembaga pemerintah, dan tidak dimiliki platform lowongan mana pun. Kami hanya tim
                yang percaya membuat CV seharusnya tidak ribet dan tidak berbayar.
              </p>
            </div>
          </section>

          <section id="misi" className="mt-12 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">Misi kami</h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Misi LolosCV murni membantu dan memudahkan orang membuat CV: yang biasa diabaikan
                tool berbayar, yaitu fresh graduate yang baru pertama kali melamar, pekerja yang
                berpindah bidang, dan siapa pun yang lebih nyaman mengisi dari HP. Itulah sebabnya
                LolosCV gratis Rp 0 selamanya, tanpa akun, dan unduhan PDF tanpa watermark. Bukan
                trial, bukan freemium yang mengunci fitur penting di balik bayaran.
              </p>
              <p>
                Fitur andalannya sederhana: tempel link lowongan, CV-mu disesuaikan dengan
                persyaratannya, lalu unduh sebagai PDF yang ramah ATS. Semua fitur utama bisa
                dipakai tanpa membayar dan tanpa mendaftar apa pun.
              </p>
            </div>
          </section>

          <section id="biaya" className="mt-12 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              Dari mana dananya, kalau gratis
            </h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                LolosCV dibiayai sendiri oleh pengembangnya. Kalau kamu merasa terbantu dan ingin
                mendukung, ada donasi via Saweria yang sepenuhnya opsional. Donasi 100% untuk
                pengembangan dan biaya jalan layanan ini, dan nama donatur tampil di leaderboard
                sebagai ucapan terima kasih.
              </p>
              <p>
                Yang perlu digarisbawahi: memberi donasi atau tidak, fitur yang kamu dapatkan sama
                persis. Tidak ada paywall tersembunyi dan tidak ada yang dikunci di balik donasi.
                Satu-satunya hal yang bisa berbiaya adalah bila kamu mengaktifkan fitur AI dengan
                kunci API milikmu sendiri, dan itu dibayar langsung ke penyedia AI-nya, bukan ke
                kami.
              </p>
            </div>
          </section>

          <section id="privasi" className="mt-12 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">Privasi, versi singkat</h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                CV-mu disimpan di browser-mu sendiri, bukan di server kami. Bila kamu memakai fitur
                AI opsional, permintaan diteruskan sekali lewat server ke penyedia AI pilihanmu dan
                tidak disimpan. Kami tidak memakai cookies pelacakan, Google Analytics, atau
                telemetri pihak ketiga. Rinciannya lengkap di{" "}
                <Link href="/privacy" className="font-medium text-primary hover:underline">
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </div>
          </section>

          <section id="independen" className="mt-12 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">Disclaimer independen</h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                LolosCV tidak berafiliasi dengan Kemnaker, MagangHub, JobStreet, LinkedIn, Glints,
                atau platform lowongan dan lembaga pemerintah mana pun. Nama-nama perusahaan,
                platform, dan lembaga yang muncul di situs ini hanya sebagai konteks lowongan atau
                contoh, bukan indikasi kemitraan, dukungan, atau kerja sama. Untuk info resmi
                program magang pemerintah, selalu cek situs resminya langsung.
              </p>
            </div>
          </section>

          {/* TODO(owner): tambahkan section #kontak dengan email/sosial asli
              sebelum publikasi. Untuk sementara seluruh section disembunyikan
              agar placeholder tidak tampil di website. */}
        </article>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              Sekalian dicoba?
            </h2>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">
              Gratis Rp 0, tanpa akun, unduh PDF tanpa watermark. Kalau terbantu, kamu sudah tahu
              di mana harus traktir kopinya.
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
