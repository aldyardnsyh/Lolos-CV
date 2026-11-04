import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Ketentuan Penggunaan",
  description:
    "Ketentuan penggunaan LolosCV: layanan gratis apa adanya, tanggung jawab kebenaran isi CV ada pada pengguna, dan LolosCV tidak menjamin hasil lamaran.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Ketentuan Penggunaan",
      item: `${SITE_URL}/terms`,
    },
  ],
}

const preClass =
  "mt-4 whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 sm:p-6 font-mono text-[12.5px] sm:text-[13.5px] leading-relaxed text-foreground/90"

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">{title}</h2>
      <div className="space-y-4 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function TermsPage() {
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
            <span className="text-foreground">Ketentuan Penggunaan</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Diperbarui 4 November 2026
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ketentuan Penggunaan
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Ketentuan ini kami tulis singkat dan manusiawi, bukan untuk membingungkan. Intinya:
            LolosCV gratis dan disediakan apa adanya, isi CV adalah tanggung jawabmu, dan kami tidak
            menjanjikan hasil lamaran.
          </p>

          <Section id="layanan" title="Layanan disediakan apa adanya, gratis">
            <p>
              LolosCV adalah tool pembuat CV yang gratis Rp 0, tanpa trial, tanpa watermark, dan
              tanpa perlu mendaftar akun. Layanan disediakan apa adanya, sebagaimana tersedia, tanpa
              jaminan bahwa semuanya selalu berjalan sempurna di semua browser dan perangkat. Kami
              terus memperbaikinya, tapi kalau ada yang berbunyi, silakan kabari kami lewat kontak
              di halaman Tentang.
            </p>
          </Section>

          <Section id="isi-cv" title="Isi CV-mu adalah tanggung jawabmu">
            <p>
              Kamu bertanggung jawab atas kebenaran isi CV-mu. LolosCV tidak mengarangi
              pengalaman kerja, keahlian, atau pencapaian yang tidak kamu miliki. Fitur AI di
              LolosCV memang dirancang untuk tidak mengarang (ia bekerja dari data yang kamu isi
              sendiri), tapi tetap cek ulang hasilnya sebelum dikirim. CV adalah pernyataanmu
              sendiri kepada perusahaan, bukan pernyataan LolosCV.
            </p>
          </Section>

          <Section id="hasil" title="Tidak ada jaminan hasil lamaran atau skor ATS">
            <p>
              LolosCV membantu menyiapkan CV yang ramah ATS (mudah dibaca mesin penyaring lamaran),
              tapi tidak ada yang bisa menjamin kamu lolos seleksi atau mendapat pekerjaan.
              Skor kecocokan yang ditampilkan adalah estimasi kecocokan kata kunci antara CV-mu dan
              lowongan target, bukan skor resmi dari sistem ATS perusahaan. Angka itu untuk
              panduan memperbaiki CV, bukan janji hasil.
            </p>
          </Section>

          <Section id="independen" title="Tidak berafiliasi dengan pihak mana pun">
            <p>
              LolosCV adalah proyek independen. Kami tidak berafiliasi dengan perusahaan yang
              lowongannya muncul di fitur analisis, tidak berafiliasi dengan platform lowongan
              seperti LinkedIn, JobStreet, atau Glints, dan tidak berafiliasi dengan lembaga
              pemerintah mana pun termasuk Kemnaker maupun MagangHub. Nama-nama perusahaan dan
              lembaga di situs ini hanya muncul sebagai konteks lowongan, bukan indikasi kemitraan
              atau dukungan.
            </p>
          </Section>

          <Section id="donasi" title="Donasi tidak mengubah apa pun">
            <p>
              Donasi via Saweria sepenuhnya opsional. Memberi donasi atau tidak, semua fitur yang
              kamu dapatkan sama persis. Tidak ada paywall tersembunyi, tidak ada fitur yang
              terbuka karena donasi, dan tidak ada yang dikurangi kalau tidak berdonasi.
            </p>
          </Section>

          <Section id="batasan" title="Batasan tanggung jawab">
            <p>
              Sepanjang diizinkan hukum yang berlaku, LolosCV tidak bertanggung jawab atas kerugian
              tidak langsung yang timbul dari penggunaan layanan, termasuk namun tidak terbatas pada
              hasil lamaran, kehilangan data di browser (misal karena pembersihan data situs atau
              ganti perangkat tanpa menyimpan file terlebih dulu), atau keputusan penyedia AI
              terkait akun dan kunci API-mu. Datamu ada di browsermu, jadi biasakan menyimpan file
              proyek secara berkala.
            </p>
          </Section>

          <Section id="privasi" title="Privasi">
            <p>
              Ketentuan ini berdampingan dengan{" "}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Kebijakan Privasi
              </Link>{" "}
              kami yang menjelaskan bagaimana datamu diperlakukan.
            </p>
          </Section>

          <Section id="kontak" title="Kontak dan perubahan ketentuan">
            <p>
              Pertanyaan atau masukan soal ketentuan ini bisa dikirim ke kontak yang tercantum di{" "}
              <Link href="/tentang" className="font-medium text-primary hover:underline">
                halaman Tentang
              </Link>
              . Ketentuan ini bisa diperbarui sewaktu-waktu mengikuti perubahan layanan; tanggal
              pembaruan selalu tercantum di bagian atas halaman.
            </p>
          </Section>

          <div className="mt-14">
            <p className="mb-4 text-sm text-muted-foreground">Ringkasan satu layar:</p>
            <pre className={preClass}>
              {`1. Gratis Rp 0, apa adanya, tanpa akun.
2. Isi CV = tanggung jawabmu. Cek ulang hasil AI.
3. Skor kecocokan itu estimasi kata kunci, bukan jaminan lolos.
4. Tidak berafiliasi dengan perusahaan maupun lembaga pemerintah.
5. Donasi tidak mengubah fitur apa pun.
6. Simpan file proyekmu secara berkala; datanya ada di browsermu.`}
            </pre>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
