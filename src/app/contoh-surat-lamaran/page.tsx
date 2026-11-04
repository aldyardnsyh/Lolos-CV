import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { buttonVariants } from "@/components/ui/button"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Contoh Surat Lamaran Kerja - Format Indonesia, Siap Copy",
  description:
    "Struktur dan 2 contoh surat lamaran kerja format Indonesia yang bisa langsung dicopy, plus cara membuatnya otomatis dari CV.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Contoh Surat Lamaran",
      item: `${SITE_URL}/contoh-surat-lamaran`,
    },
  ],
}

const preClass =
  "mt-6 whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 sm:p-6 font-mono text-[12.5px] sm:text-[13.5px] leading-relaxed text-foreground/90"

function WhyBox({ points }: { points: string[] }) {
  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <h3 className="mb-2 font-display text-base font-semibold text-foreground">
        Kenapa contoh ini ditulis begini
      </h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}

const struktur = [
  {
    name: "Kepala surat",
    desc: "Tempat dan tanggal surat, lalu data pribadimu: nama, alamat, nomor telepon, dan email. Letakkan di bagian atas supaya HRD langsung tahu siapa yang melamar dan bagaimana menghubungimu.",
  },
  {
    name: "Hal dan Lampiran",
    desc: "Baris Hal berisi tujuan surat, misal Lamaran Pekerjaan sebagai Admin. Baris Lampiran menyebut jumlah berkas yang disertakan, misal CV dan transkrip nilai. Tidak wajib di semua perusahaan, tapi lazim di Indonesia dan menunjukkan kamu teliti.",
  },
  {
    name: "Salam pembuka",
    desc: "Tujuan surat: Kepada Yth. Bapak/Ibu HRD [Nama Perusahaan], lalu sapaan Dengan hormat. Kalau tidak tahu nama penerimanya, alamatkan ke HRD secara umum, jangan menebak nama.",
  },
  {
    name: "Paragraf pembuka isi",
    desc: "Sebut posisi yang dilamar dan di mana kamu menemukan lowongan itu. Satu kalimat saja. Ini membantu HRD mencocokkan lamaran dengan lowongan yang sedang dibukanya.",
  },
  {
    name: "Paragraf inti",
    desc: "Jual dirimu secara ringkas: kualifikasi, pengalaman, dan 2-3 pencapaian yang relevan dengan persyaratan lowongan. Yang membuat surat lamaran kuat adalah angka, bukan kata sifat. Tulis volume kerja, hasil, atau pencapaian yang bisa diukur.",
  },
  {
    name: "Paragraf penutup dan salam akhir",
    desc: "Sebut lampiran yang disertakan, sampaikan harapan wawancara, ucapkan terima kasih, lalu tutup dengan Hormat saya dan nama lengkap. Tanda tangan digital atau nama saja keduanya bisa.",
  },
]

const tips = [
  "Sesuaikan setiap lamaran dengan lowongannya. Posisi, nama perusahaan, dan pencapaian yang disorot harus cocok dengan yang ditulis di iklan lowongan, bukan satu template untuk semua perusahaan.",
  "Sebut sumber lowongan di paragraf pembuka. HRD menangani banyak kanal sekaligus dan kalimat ini membantu mereka mencocokkan lamaranmu dengan cepat.",
  "Ganti semua bagian dalam kurung siku seperti [Nama Perusahaan] dan [Tanggal] sebelum mengirim. Surat dengan placeholder yang lupa diganti langsung gugur di mata pembaca.",
  "Satu halaman cukup. Surat lamaran adalah pengantar CV, bukan salinannya: 3-4 paragraf singkat yang menjawab kenapa kamu cocok sudah lebih dari cukup.",
  "Cek ejaan dan nama perusahaan dua kali. Salah mengetik nama perusahaan yang dilamar adalah kesalahan paling mahal karena terlihat tidak teliti, padahal kamu bisa saja sedang melamar posisi administrasi yang menuntut ketelitian.",
]

export default function ContohSuratLamaranPage() {
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
            <span className="text-foreground">Contoh Surat Lamaran</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Gratis, siap copy
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Contoh Surat Lamaran Kerja Format Indonesia
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Struktur standar surat lamaran kerja Indonesia plus dua contoh lengkap yang bisa langsung
            dicopy: satu untuk fresh graduate dan satu untuk yang sudah berpengalaman. Ganti bagian
            dalam kurung siku dengan datamu, sesuaikan angkanya dengan pengalaman aslimu, dan suratmu
            siap dikirim.
          </p>

          <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
            <p>
              Di Indonesia, surat lamaran hampir selalu diminta bersama CV sebagai lampiran
              pengajuan kerja atau magang. CV menampilkan riwayatmu secara ringkas, sedangkan surat
              lamaran menjawab satu hal: kenapa kamu cocok untuk posisi ini di perusahaan ini.
              Karena itu surat lamaran yang baik pendek, spesifik, dan langsung ke persyaratan
              lowongan, bukan cerita panjang tentang semua pengalaman hidup.
            </p>
          </div>

          <section id="struktur" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              Struktur surat lamaran Indonesia
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Surat lamaran format Indonesia punya enam bagian yang hampir selalu sama urutannya.
              Kenali sekali, lalu kamu bisa menyusunnya untuk lowongan apa pun.
            </p>
            <div className="mt-6 space-y-5">
              {struktur.map((item, index) => (
                <div key={item.name} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-1.5 font-display text-base font-semibold text-foreground">
                    {index + 1}. {item.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="contoh-fresh-graduate" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              Contoh 1: Surat Lamaran Fresh Graduate (Admin)
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kapan pakai contoh ini: baru lulus dan belum punya pengalaman kerja formal. Pengalaman
              organisasi ditulis dengan angka yang sama rapi seperti pengalaman kerja, dan itu
              sudah cukup untuk melamar posisi admin entry level.
            </p>
            <pre className={preClass}>
              {`[Kota], [Tanggal]

Nama Anda
Jl. [Nama Jalan] No. [x], [Kota]
08xx-xxxx-xxxx | nama.email@email.com

Hal      : Lamaran Pekerjaan sebagai Staff Administrasi
Lampiran : 2 (dua) berkas

Kepada Yth.
Bapak/Ibu HRD [Nama Perusahaan]
di Tempat

Dengan hormat,

Berdasarkan informasi lowongan kerja yang saya temukan di [sumber
lowongan], saya bermaksud mengajukan lamaran untuk posisi Staff
Administrasi di [Nama Perusahaan].

Saya fresh graduate D3 Administrasi Bisnis [Nama Kampus] dengan IPK
3,40. Selama kuliah saya aktif menangani administrasi kegiatan, dan
beberapa hasil kerja yang relevan untuk posisi ini:

- Mengelola pendaftaran 300+ peserta seminar kampus dengan Google
  Forms dan spreadsheet
- Menyusun laporan pertanggungjawaban kegiatan dana Rp 10 juta
  tepat tenggat
- Mengarsipkan 200+ dokumen kegiatan dengan sistem folder digital
  agar mudah dicari

Sebagai bahan pertimbangan, bersama surat ini saya lampirkan CV,
transkrip nilai, dan sertifikat pendukung. Saya berharap dapat
diberi kesempatan wawancara untuk menjelaskan kualifikasi saya
lebih lanjut.

Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.

Hormat saya,

Nama Anda`}
            </pre>
            <WhyBox
              points={[
                "Pengalaman organisasi ditulis dengan angka volume (peserta, dana, dokumen), bukan kata sifat seperti rajin dan bertanggung jawab.",
                "Baris Hal dan Lampiran menyebut posisi dan jumlah berkas dengan jelas, sesuai format surat resmi Indonesia.",
                "Paragraf pembuka menyebut sumber lowongan, sehingga HRD langsung bisa mencocokkan lamaran dengan iklannya.",
              ]}
            />
          </section>

          <section id="contoh-berpengalaman" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              Contoh 2: Surat Lamaran Berpengalaman (Logistics)
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kapan pakai contoh ini: sudah bekerja dan ingin pindah kerja atau naik posisi.
              Fokusnya pada pencapaian terukur dari pengalaman sebelumnya yang relevan dengan
              lowongan target, bukan menceritakan semua riwayat kerja dari awal.
            </p>
            <pre className={preClass}>
              {`[Kota], [Tanggal]

Nama Anda
[Kota] | 08xx-xxxx-xxxx | nama.email@email.com

Hal      : Lamaran Pekerjaan sebagai Logistics Staff
Lampiran : 2 (dua) berkas

Kepada Yth.
Bapak/Ibu HRD [Nama Perusahaan]
di Tempat

Dengan hormat,

Melalui surat ini saya bermaksud melamar posisi Logistics Staff di
[Nama Perusahaan] sesuai informasi lowongan yang saya lihat di
[sumber lowongan].

Saya memiliki pengalaman kerja 3 tahun di bidang gudang dan
distribusi. Beberapa pencapaian yang relevan dengan posisi ini:

- Mengelola stok 500+ SKU dengan akurasi stok 98% pada opname
  bulanan
- Menginput 80-100 surat jalan per hari dengan tingkat kesalahan
  di bawah 1%
- Membantu menurunkan waktu loading 15% melalui penataan ulang
  area staging

Saya terbiasa bekerja dengan sistem WMS dan Microsoft Excel, serta
berkoordinasi harian dengan tim pengiriman dan vendor. CV lengkap
dan dokumen pendukung saya lampirkan bersama surat ini.

Saya berharap dapat diberi kesempatan wawancara untuk berdiskusi
lebih lanjut tentang kontribusi yang bisa saya berikan kepada
[Nama Perusahaan].

Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.

Hormat saya,

Nama Anda`}
            </pre>
            <WhyBox
              points={[
                "Pencapaian memakai angka yang dipahami HRD logistics: akurasi stok, jumlah surat jalan, penurunan waktu loading.",
                "Skill khusus (WMS, Excel) disebut dalam kalimat kerja nyata, bukan daftar kosong tanpa konteks.",
                "Pengalaman 3 tahun dirangkum langsung ke pencapaian terukur, tanpa menceritakan ulang seluruh riwayat kerja dari awal.",
              ]}
            />
          </section>

          <section id="tips" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              5 tips singkat sebelum kirim
            </h2>
            <ol className="list-decimal space-y-3 pl-5 leading-relaxed text-muted-foreground">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ol>
            <div className="mt-6 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
              Catatan jujur: angka di kedua contoh di atas adalah ilustrasi format, bukan data orang
              sungguhan. Jangan copy angkanya begitu saja. HRD lebih percaya bullet dengan angka
              moderat yang asli daripada angka besar yang tidak bisa dijelaskan saat wawancara.
            </div>
          </section>

          <section id="dari-cv" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              Mau suratnya otomatis dari CV-mu?
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kalau CV-mu sudah ada di LolosCV, kamu tidak perlu menulis dari nol. Fitur Surat
              Lamaran menyusun draf dari data CV-mu, lengkap dengan struktur di atas, lalu kamu
              tinggal menyempurnakannya.
            </p>
          </section>
        </article>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              Buat surat lamaran otomatis dari CV-mu
            </h2>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">
              Isi CV sekali di builder, dapat draf surat lamaran yang tersusun otomatis. Gratis,
              tanpa akun, dan kirimannya bisa disimpan sebagai PDF.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/#surat-lamaran" className={cn(buttonVariants({ size: "lg" }))}>
                Buat surat lamaran dari CV-mu
              </Link>
              <Link
                href="/contoh-cv-ats"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Lihat contoh CV ATS-friendly
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Surat lamaran butuh pendamping CV yang rapi. Contohnya ada di halaman{" "}
              <Link href="/contoh-cv-ats" className="font-medium text-primary hover:underline">
                Contoh CV ATS per profesi
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
