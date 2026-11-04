import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { buttonVariants } from "@/components/ui/button"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Contoh CV ATS-Friendly per Profesi - Gratis, Bisa Dicopy",
  description:
    "Kumpulan contoh CV ATS-friendly yang bisa langsung dicopy: admin, fresh graduate, logistics, marketing, dan IT. Lengkap dengan penjelasan kenapa strukturnya demikian.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Contoh CV ATS",
      item: `${SITE_URL}/contoh-cv-ats`,
    },
  ],
}

const exampleChips = [
  { href: "#admin", label: "Admin / Staff Administrasi" },
  { href: "#fresh-graduate", label: "Fresh Graduate" },
  { href: "#logistics", label: "Logistics / Supply Chain" },
  { href: "#marketing", label: "Marketing Staff" },
]

const preClass =
  "mt-6 whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 sm:p-6 font-mono text-[12.5px] sm:text-[13.5px] leading-relaxed text-foreground/90"

function WhyAtsBox({ points }: { points: string[] }) {
  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <h3 className="mb-2 font-display text-base font-semibold text-foreground">
        Kenapa contoh ini ramah ATS
      </h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ContohCvAtsPage() {
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
            <span className="text-foreground">Contoh CV ATS</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Gratis, bisa dicopy
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Contoh CV ATS-Friendly per Profesi
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Empat contoh CV ATS-friendly siap salin untuk profesi yang paling banyak dicari: admin,
            fresh graduate, logistics, dan marketing. Semua ditulis sebagai teks biasa, lengkap
            dengan penjelasan kenapa strukturnya dibuat demikian.
          </p>

          <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
            <p>
              CV ATS-friendly adalah CV yang strukturnya bisa dibaca dengan rapi oleh ATS
              (Applicant Tracking System), aplikasi penyaring lamaran yang dipakai banyak perusahaan
              sebelum HRD membaca CV-mu secara manual. Format yang salah, seperti kolom ganda atau
              heading tidak standar, bisa membuat isi CV terbaca kacau oleh mesin. Akibatnya
              lamaranmu berhenti di tahap penyaringan, jauh sebelum ada manusia yang menilai
              kualitasimu.
            </p>
            <p>
              Cara pakai halaman ini sederhana: pilih contoh sesuai profilmu, copy blok teksnya,
              lalu ganti bagian dalam kurung siku seperti [Nama Perusahaan] dengan datamu sendiri.
              Setiap contoh ditutup dengan kotak penjelasan agar kamu paham polanya, bukan sekadar
              meniru.
            </p>
          </div>

          <div className="my-8 flex flex-wrap gap-2">
            {exampleChips.map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {chip.label}
              </Link>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            Catatan: bagian dalam kurung siku, misal [Nama Perusahaan], wajib diganti dengan datamu.
            Angka di setiap bullet adalah contoh ilustratif dengan nilai yang masuk akal untuk
            bidangnya, bukan data orang sungguhan. Selalu ganti dengan angka dan pengalaman aslimu.
            CV yang bagus di atas kertas tetap harus jujur isinya.
          </div>

          <section id="admin" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              1. Contoh CV Admin / Staff Administrasi
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kapan pakai contoh ini: melamar posisi administrasi perkantoran, staff admin, admin
              gudang dokumen, atau sekretaris. Peran admin dinilai dari ketelitian dan volume kerja,
              jadi bullet-nya memakai angka dokumen dan tingkat kesalahan.
            </p>
            <pre className={preClass}>
              {`NAMA ANDA
Kota | 08xx-xxxx-xxxx | nama.email@email.com | linkedin.com/in/namaanda

HEADLINE
Staff Administrasi | Pengelolaan Arsip & Administrasi Perkantoran

RINGKASAN
Staff administrasi dengan pengalaman 2 tahun menangani administrasi
perkantoran, arsip vendor, dan pemrosesan invoice. Terbiasa bekerja
dengan Excel tingkat lanjut dan sistem pelaporan mingguan.

PENGALAMAN KERJA
Staff Administrasi - [Nama Perusahaan] | Mar 2024 - Sekarang
- Mengelola arsip 200+ dokumen vendor per bulan dengan sistem folder digital
- Memproses 50-70 invoice per minggu dengan tingkat kesalahan di bawah 1%
- Menyusun laporan mingguan dengan Excel (VLOOKUP dan pivot table)

Asisten Administrasi - [Nama Perusahaan] | Jun 2022 - Feb 2024
- Menginput 100+ data transaksi per hari ke sistem internal perusahaan
- Menyiapkan dokumen rapat dan notulen untuk 4 divisi setiap minggu
- Memindahkan arsip 3 tahun ke folder digital agar pencarian dokumen lebih cepat

MAGANG
Magang Administrasi - [Nama Instansi/Perusahaan] | Jan 2022 - Mei 2022
- Membantu rekap data kehadiran 60+ pegawai setiap bulan
- Mengarsipkan surat masuk dan keluar dengan nomor agenda
- Mengetik ulang dan merapikan dokumen lama agar mudah dicari

PENDIDIKAN
D3 Administrasi Bisnis, [Nama Kampus] | 2019 - 2022
IPK 3,40

SKILL
Administrasi perkantoran, pengarsipan, input data, Microsoft Excel
(VLOOKUP, pivot table), Microsoft Word, e-mail korporat, e-Faktur dasar`}
            </pre>
            <WhyAtsBox
              points={[
                "Heading standar (Pengalaman Kerja, Pendidikan, Skill) yang dikenali hampir semua ATS saat memetakan isi CV.",
                "Kata kunci bidang administrasi seperti arsip, invoice, input data, dan Excel muncul alami di bullet, bukan ditumpuk di bagian bawah.",
                "Setiap bullet memuat angka, sehingga HRD yang membaca setelah mesin langsung melihat volume dan hasil kerjamu.",
              ]}
            />
          </section>

          <section id="fresh-graduate" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              2. Contoh CV Fresh Graduate (Umum)
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kapan pakai contoh ini: baru lulus dan belum punya pengalaman kerja formal. Pengalaman
              organisasi, panitia, dan proyek skripsi menggantikan pengalaman kerja, tetapi ditulis
              dengan struktur dan angka yang sama seperti pengalaman profesional.
            </p>
            <pre className={preClass}>
              {`NAMA ANDA
Kota | 08xx-xxxx-xxxx | nama.email@email.com | linkedin.com/in/namaanda

HEADLINE
Fresh Graduate Administrasi Bisnis | Siap Berkontribusi di Tim Operasional

RINGKASAN
Fresh graduate Administrasi Bisnis dengan IPK 3,40 dan pengalaman
organisasi 3 tahun. Terbiasa memimpin tim kecil, menyusun laporan
kegiatan, dan mengelola administrasi acara kampus.

PENGALAMAN ORGANISASI
Ketua Divisi Acara - [Nama Organisasi Kampus] | Feb 2023 - Des 2024
- Memimpin 8 anggota divisi acara dalam seminar tahunan yang dihadiri 150+ peserta
- Menyusun rundown dan anggaran acara dengan dana Rp 10 juta dari sponsor dan pendaftaran
- Mengoordinasikan 3 sesi talkshow dengan pembicara dari industri terkait

Anggota Panitia - [Nama Kegiatan Kampus] | Agu 2022 - Nov 2022
- Menangani pendaftaran 300+ peserta dengan Google Forms dan spreadsheet
- Menyusun laporan pertanggungjawaban kegiatan dan diserahkan tepat waktu
- Membuat dokumentasi foto dan video kegiatan untuk laporan akhir

PROYEK
Proyek Skripsi - [Judul Singkat] | Agu 2024 - Jan 2025
- Meneliti perilaku [topik] dengan 120 responden menggunakan kuesioner online
- Menganalisis data dengan SPSS dan menyelesaikan analisis dalam 5 bulan
- Menyusun bab pembahasan dan rekomendasi berdasarkan hasil analisis

PENDIDIKAN
S1 Administrasi Bisnis, [Nama Kampus] | 2021 - 2025
IPK 3,40 | Lulus tepat waktu

SKILL
Microsoft Office (Word, Excel, PowerPoint), Google Workspace, manajemen
waktu, kerja tim, komunikasi tertulis, Bahasa Inggris (profesional)`}
            </pre>
            <WhyAtsBox
              points={[
                "Pengalaman organisasi dan proyek ditulis dengan heading, tanggal, dan bullet terukur seperti pengalaman kerja, sehingga ATS tetap bisa memetakannya.",
                "Headline menyebut posisi target, mesin dan HRD langsung tahu arah lamaranmu tanpa menebak.",
                "Skill memuat kata kunci yang umum muncul di lowongan entry level: Microsoft Office, Google Workspace, kerja tim, dan Bahasa Inggris.",
              ]}
            />
          </section>

          <section id="logistics" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              3. Contoh CV Logistics / Supply Chain Staff
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kapan pakai contoh ini: melamar posisi logistics staff, staff gudang, inventory, atau
              supply chain entry level. Bidang ini dinilai dari akurasi stok dan kecepatan proses,
              jadi angka operasional adalah bintangnya.
            </p>
            <pre className={preClass}>
              {`NAMA ANDA
Kota | 08xx-xxxx-xxxx | nama.email@email.com | linkedin.com/in/namaanda

HEADLINE
Logistics Staff | Inventory Control & Distribusi

RINGKASAN
Logistics staff dengan pengalaman 2 tahun di gudang dan distribusi.
Terbiasa mengelola stok, menjalankan stok opname, dan menginput data
ke sistem gudang dengan target akurasi tinggi.

PENGALAMAN KERJA
Logistics Staff - [Nama Perusahaan] | Apr 2023 - Sekarang
- Mengelola stok 500+ SKU dengan akurasi stok 98% pada opname bulanan
- Menginput 80-100 surat jalan per hari ke sistem gudang
- Mengurangi waktu loading rata-rata 15% dengan penataan ulang area staging

Magang Warehouse - [Nama Perusahaan] | Jul 2022 - Des 2022
- Membantu proses receiving dan putaway 20-30 pallet per hari
- Mencatat selisih stok dan menyiapkan laporan untuk supervisor
- Memastikan label dan nomor rak sesuai sebelum barang masuk penyimpanan

Asisten Gudang - [Nama Perusahaan] | Jan 2021 - Jun 2022
- Menyiapkan paket pengiriman sesuai dokumen surat jalan
- Menjaga kerapian gudang dengan standar 5S
- Menghitung barang sisa di akhir hari dan melaporkan selisihnya

PENDIDIKAN
D3 Manajemen, [Nama Kampus] | 2018 - 2021

SKILL
Inventory management, stok opname, input WMS, surat jalan, Microsoft
Excel, SAP dasar, prinsip 5S, K3 gudang`}
            </pre>
            <WhyAtsBox
              points={[
                "Kata kunci industri seperti stok opname, surat jalan, WMS, dan 5S tercantum di bullet dan bagian skill, sesuai istilah yang dipakai lowongan logistik.",
                "Angka operasional (SKU, akurasi stok, surat jalan per hari) adalah cara kerja nyata bidang ini, jadi bullet langsung terasa relevan di mata HRD.",
                "Format tanggal dan heading konsisten di semua entri, sehingga parsing pengalaman tidak kacau.",
              ]}
            />
          </section>

          <section id="marketing" className="mt-14 scroll-mt-24">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">
              4. Contoh CV Marketing Staff
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Kapan pakai contoh ini: melamar posisi marketing staff, social media officer, atau
              digital marketing entry level. Marketing dinilai dari hasil kampanye, jadi bullet
              memakai metrik yang dipahami HRD marketing.
            </p>
            <pre className={preClass}>
              {`NAMA ANDA
Kota | 08xx-xxxx-xxxx | nama.email@email.com | linkedin.com/in/namaanda

HEADLINE
Marketing Staff | Digital Marketing & Content

RINGKASAN
Marketing staff dengan pengalaman 2 tahun menangani media sosial dan
campaign digital. Terbiasa menyusun kalender konten, menjalankan iklan,
dan membaca metrik untuk merencanakan kampanye berikutnya.

PENGALAMAN KERJA
Marketing Staff - [Nama Perusahaan] | Mei 2023 - Sekarang
- Mengelola akun Instagram dan TikTok dengan penambahan follower 40% dalam 6 bulan
- Menyusun 12 konten per bulan dengan rata-rata engagement 5%
- Menjalankan iklan Meta Ads dengan target leads [angka leads] per bulan

Magang Social Media - [Nama Perusahaan] | Jan 2022 - Agu 2022
- Menyusun caption dan jadwal posting 3 kali per minggu
- Mendukung 2 campaign peluncuran produk dari persiapan konten sampai pelaporan
- Mengarsipkan foto produk dan bahan konten di folder bersama tim

Freelance Content Writer - [Jenis Klien] | 2021 - 2022
- Menulis 20+ artikel promosi untuk UMKM dan toko online
- Meneliti kata kunci sebelum menulis agar artikel sesuai pencarian pembeli
- Merevisi artikel sesuai masukan klien, rata-rata 1-2 kali revisi per artikel

PENDIDIKAN
S1 Manajemen Pemasaran, [Nama Kampus] | 2019 - 2023

SKILL
Digital marketing, social media management, Meta Ads, Google Ads,
copywriting, content calendar, Canva, analisis metrik kampanye`}
            </pre>
            <WhyAtsBox
              points={[
                "Kata kunci digital marketing seperti Meta Ads, engagement, dan content calendar sesuai istilah yang dipakai lowongan marketing.",
                "Hasil ditulis dengan metrik yang dipahami HRD bidang ini: follower, engagement, leads, dan jumlah konten.",
                "Satu kolom tanpa tabel atau ikon di info inti, sehingga semua teks terbaca utuh oleh mesin.",
              ]}
            />
          </section>

          <section className="mt-14 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="mb-3 font-display text-2xl font-bold">Siap daftar Magang Kemnaker?</h2>
            <div className="space-y-3 leading-relaxed text-muted-foreground">
              <p>
                Program Pemagangan Nasional dari Kementerian Ketenagakerjaan membuka kesempatan
                magang bagi fresh graduate, dan CV adalah salah satu dokumen yang disiapkan saat
                mendaftar. Contoh fresh graduate di halaman ini bisa jadi titik awal untuk menyusun
                CV-mu sebelum mendaftar.
              </p>
              <p>
                Semua informasi resmi soal jadwal, syarat, dan cara pendaftaran selalu cek langsung
                di{" "}
                <a
                  href="https://maganghub.kemnaker.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  maganghub.kemnaker.go.id
                </a>
                . Catatan jujur: LolosCV independen, tidak berafiliasi dan tidak bekerja sama dengan
                Kemnaker maupun MagangHub. Kami hanya membantu menyiapkan CV-nya.
              </p>
            </div>
          </section>
        </article>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              Siap ubah contoh ini jadi CV-mu?
            </h2>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">
              Copy contoh di atas, buka builder, lalu sesuaikan dengan pengalamanmu. Gratis, tanpa
              akun, unduh PDF tanpa watermark.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/#builder" className={cn(buttonVariants({ size: "lg" }))}>
                Pakai contoh ini di builder
              </Link>
              <Link
                href="/template-cv-ats"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Lihat 4 template CV
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Baru tahu apa itu ATS? Baca{" "}
              <Link href="/cv-ats-friendly" className="font-medium text-primary hover:underline">
                panduan CV ATS-friendly
              </Link>{" "}
              dulu, atau kembali ke{" "}
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
