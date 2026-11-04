import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { buttonVariants } from "@/components/ui/button"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Panduan CV ATS-Friendly: Apa Itu ATS dan Cara Lolos Screening",
  description:
    "Panduan lengkap CV ATS-friendly dalam bahasa awam: apa itu ATS, checklist 10 poin, do dan dont, serta miskonsepsi soal skor ATS.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Panduan CV ATS-Friendly",
      item: `${SITE_URL}/cv-ats-friendly`,
    },
  ],
}

const checklist = [
  {
    judul: "Satu kolom",
    isi: "ATS membaca dokumen dari atas ke bawah. Kolom ganda membuat urutan teks kacau saat dibaca mesin, misalnya nama tercampur dengan tanggal.",
  },
  {
    judul: "Heading standar",
    isi: "Gunakan nama bagian yang umum seperti Pengalaman Kerja, Pendidikan, dan Skill. Heading kreatif tidak dikenali mesin sehingga isinya bisa terlewat.",
  },
  {
    judul: "PDF text-based, bukan gambar",
    isi: "Pastikan teks di PDF-mu bisa di-select dan di-copy. CV berupa screenshot atau hasil scan tidak bisa dibaca ATS sama sekali.",
  },
  {
    judul: "Kata kunci dari lowongan",
    isi: "Baca persyaratan lowongan, lalu gunakan kata yang sama di skill dan pengalamanmu, selama itu benar kamu punya. Mesin mencocokkan kata, bukan makna.",
  },
  {
    judul: "Bullet terukur dengan angka",
    isi: "Tulis hasil kerja dengan angka, misal mengelola arsip 200+ dokumen per bulan. Ini lebih kuat daripada sekadar bertanggung jawab atas arsip.",
  },
  {
    judul: "Font body minimal 10-11pt",
    isi: "Pakai font standar seperti Arial atau Calibri dengan ukuran body 10-12pt. Font dekoratif dan huruf terlalu kecil menyulitkan pembacaan mesin dan manusia.",
  },
  {
    judul: "Format tanggal konsisten",
    isi: "Pilih satu gaya, misal Jan 2023 - Mar 2025 atau 01/2023 - 03/2025, lalu pakai gaya yang sama di semua entri.",
  },
  {
    judul: "Hindari tabel dan ikon di info inti",
    isi: "Nama, nomor telepon, dan daftar pengalaman yang ditulis dalam tabel atau ikon sering gagal terbaca. Ikon boleh untuk dekorasi, bukan untuk membawa info penting.",
  },
  {
    judul: "Panjang 1-2 halaman",
    isi: "Fresh graduate cukup 1 halaman. Yang sudah bekerja bertahun-tahun maksimal 2 halaman. Isi yang relevan menang melawan isi yang panjang.",
  },
  {
    judul: "Cek hasil akhir dengan print preview",
    isi: "Sebelum mengirim, buka print preview. Kalau layout bergeser, teks terpotong, atau muncul halaman kosong, perbaiki dulu. HRD menerima CV apa adanya.",
  },
]

const doDontRows = [
  {
    do: "Mulai bullet dengan hasil terukur, misal memproses 50-70 invoice per minggu",
    dont: "Menulis bertanggung jawab atas tugas X tanpa hasil yang bisa diukur",
  },
  {
    do: "Heading standar: Pengalaman Kerja, Pendidikan, Skill",
    dont: "Heading kreatif atau campur bahasa yang tidak dikenali mesin",
  },
  {
    do: "Kirim PDF text-based yang teksnya bisa di-select",
    dont: "Screenshot CV, CV hasil scan, atau PDF berisi gambar",
  },
  {
    do: "Sesuaikan kata kunci dengan setiap lowongan yang dilamar",
    dont: "Satu CV identik untuk semua lowongan tanpa penyesuaian",
  },
  {
    do: "Font standar 10-12pt seperti Arial atau Calibri",
    dont: "Font dekoratif dan huruf di bawah 10pt",
  },
  {
    do: "Satu format tanggal untuk semua entri pengalaman",
    dont: "Tanggal campur aduk antara Jan 2023, 01/2023, dan 2023-01",
  },
]

const faqItems = [
  {
    q: "Apakah CV dua kolom otomatis gugur?",
    a: "Tidak otomatis, tapi risikonya naik. Banyak ATS membaca dua kolom secara berurutan sehingga teks kacau saat dipetakan. Satu kolom tetap pilihan paling aman, apalagi untuk korporat besar dan BUMN.",
  },
  {
    q: "CV harus bahasa Inggris?",
    a: "Ikuti bahasa lowongan. Kalau lowongan ditulis dalam bahasa Indonesia, pakai bahasa Indonesia. Kata kunci teknis yang memang berbahasa Inggris, misal Microsoft Excel atau Google Ads, tetap ditulis apa adanya.",
  },
  {
    q: "PDF atau Word?",
    a: "PDF text-based umumnya aman dan tampilannya stabil di semua perangkat. Tapi kalau lowongan secara eksplisit meminta format lain, ikuti instruksinya, karena bisa jadi sistem mereka hanya membaca format itu.",
  },
  {
    q: "Template ramah ATS berarti pasti lolos?",
    a: "Tidak ada tool yang bisa menjanjikan itu. Template ramah ATS membuat CV-mu mudah dibaca mesin, sedangkan yang menentukan setelahnya adalah kecocokan pengalaman dan kata kunci dengan lowongan. Format hanya tahap pertama.",
  },
]

export default function CvAtsFriendlyPage() {
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
            <span className="text-foreground">Panduan CV ATS-Friendly</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Bahasa awam, tanpa jargon
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Panduan CV ATS-Friendly
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Apa itu ATS, kenapa CV bisa berhenti sebelum dibaca HRD, checklist 10 poin yang bisa
            langsung dipraktikkan, plus do dan dont beserta miskonsepsi yang sering beredar.
          </p>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            Apa itu ATS?
          </h2>
          <div className="space-y-4 leading-relaxed text-muted-foreground">
            <p>
              ATS (Applicant Tracking System) adalah aplikasi yang dipakai perusahaan untuk mengelola
              lamaran kerja. Sebelum HRD membaca CV-mu, lamaran sering melewati ATS dulu: sistem
              membaca isi CV, memetakan datanya ke kolom profil, lalu membantu menyaring atau
              mengurutkan kandidat berdasarkan kecocokan dengan lowongan.
            </p>
            <p>
              Analogi sederhananya: ATS itu petugas pintu. Kalau CV-mu formatnya berantakan, petugas
              ini bisa membaca datamu secara salah, atau tidak bisa membacanya sama sekali. Lamaran
              berhenti di pintu, jauh sebelum ada manusia yang menilai kualitasimu. Itulah kenapa
              format yang benar penting, bukan hanya isi yang bagus.
            </p>
            <p>
              Satu hal yang sering disalahpahami: ATS bukan penilai kecantikan desain. Ia tidak
              peduli CV-mu berwarna atau hitam putih. Yang ia butuhkan adalah teks yang terbaca dan
              terstruktur. Makanya CV ramah ATS biasanya terlihat sederhana: satu kolom, heading
              standar, dan font yang jelas. Semakin besar perusahaan yang menerima ribuan lamaran
              lewat portal kerja, semakin besar kemungkinan CV-mu dibaca mesin dulu, bukan manusia.
            </p>
          </div>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            Checklist 10 poin CV ramah ATS
          </h2>
          <p className="mb-6 leading-relaxed text-muted-foreground">
            Sepuluh poin di bawah bisa langsung dicek pada CV yang sedang kamu pakai. Perbaiki yang
            belum terpenuhi, biasanya butuh waktu kurang dari 15 menit.
          </p>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed text-muted-foreground">
            {checklist.map((item) => (
              <li key={item.judul} className="pl-1">
                <strong className="font-semibold text-foreground">{item.judul}.</strong> {item.isi}
              </li>
            ))}
          </ol>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            Do dan dont
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 text-left font-semibold text-foreground">
                    Lakukan
                  </th>
                  <th className="py-3 text-left font-semibold text-foreground">Hindari</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {doDontRows.map((row) => (
                  <tr key={row.do} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 leading-relaxed">{row.do}</td>
                    <td className="py-3 leading-relaxed">{row.dont}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            Miskonsepsi yang sering terjadi
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                ATS memberi skor yang dilihat HRD
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                Banyak orang membayangkan HRD membuka CV-mu lalu melihat angka skor ATS besar di
                layar. Realitanya tiap perusahaan memakai sistem dan alur yang berbeda, dan tidak ada
                skor ATS universal yang ditampilkan ke HRD. Jangan terpaku pada angka; fokuskan
                tenaga pada keterbacaan format dan kecocokan isi dengan lowongan.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                Skor di tool berarti simulasi ATS sungguhan
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                Skor kecocokan di tool apa pun, termasuk di LolosCV, adalah estimasi kecocokan kata
                kunci dan struktur terhadap lowongan yang kamu tempel. Itu bukan simulasi ATS
                perusahaan mana pun, karena sistem mereka tidak bisa diakses dari luar dan
                perilakunya berbeda-beda. Angka ini berguna sebagai arah perbaikan, bukan ramalan
                hasil seleksi.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                Format ramah ATS berarti boleh menggembungkan isi
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                Tidak. Format yang benar hanya membuat CV-mu terbaca; isinya tetap harus jujur dan
                nyata. HRD membaca setelah mesin, dan angka karangan gampang ketahuan saat interview.
                CV yang bagus di atas kertas tetap harus benar-benar milikmu.
              </p>
            </div>
          </div>

          <h2 className="mt-14 mb-4 font-display text-2xl font-bold md:text-3xl">
            FAQ singkat
          </h2>
          <div className="space-y-6">
            {faqItems.map((item) => (
              <div key={item.q}>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{item.q}</h3>
                <p className="leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </article>

        <section className="border-t border-border bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="mb-3 font-display text-2xl font-bold md:text-3xl">
              Praktikkan panduan ini sekarang
            </h2>
            <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">
              Tempel link lowongan untuk mengecek kecocokan kata kunci CV-mu, atau langsung buat CV
              baru dengan template satu kolom yang ramah ATS. Gratis, tanpa akun.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/#ats-optimizer" className={cn(buttonVariants({ size: "lg" }))}>
                Cek kecocokan CV-mu
              </Link>
              <Link
                href="/#builder"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Buat CV-nya
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Butuh isi CV-nya dulu?{" "}
              <Link href="/contoh-cv-ats" className="font-medium text-primary hover:underline">
                Lihat contoh CV per profesi
              </Link>{" "}
              dan{" "}
              <Link href="/template-cv-ats" className="font-medium text-primary hover:underline">
                pilih template-nya
              </Link>
              , atau kembali ke{" "}
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
