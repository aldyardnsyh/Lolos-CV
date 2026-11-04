import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Bagaimana LolosCV memperlakukan data CV kamu: disimpan di browser, permintaan AI lewat server sekali lewat tanpa disimpan, tanpa pelacakan.",
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Kebijakan Privasi",
      item: `${SITE_URL}/privacy`,
    },
  ],
}

const storageKeys = [
  { key: "resume_data", desc: "isi CV-mu (data yang kamu isi di builder)." },
  { key: "api_config", desc: "konfigurasi API AI milikmu sendiri, bila kamu mengaktifkannya." },
  { key: "job_analysis", desc: "hasil analisis link lowongan yang terakhir kamu jalankan." },
  { key: "resume_lang", desc: "pilihan bahasa CV (Indonesia atau Inggris)." },
  { key: "resume_style", desc: "template CV yang kamu pilih." },
  { key: "resume_layout", desc: "pengaturan tata letak CV." },
  { key: "resume_data_before_generate", desc: "salinan cadangan CV sebelum fitur generate dijalankan, untuk tombol urungkan." },
  { key: "resume_sections_open", desc: "posisi bagian form yang terbuka." },
  { key: "maganghub_banner_dismissed", desc: "penanda bahwa kamu sudah menutup banner kampanye." },
  { key: "donation_modal_dismissed", desc: "penanda bahwa kamu memilih tidak ditawari donasi lagi." },
  { key: "theme", desc: "pilihan tema terang atau gelap." },
]

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

export default function PrivacyPage() {
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
            <span className="text-foreground">Kebijakan Privasi</span>
          </nav>

          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Diperbarui 4 November 2026
          </span>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Kebijakan Privasi
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Kebijakan ini menjelaskan dengan jujur apa yang terjadi pada datamu saat memakai
            LolosCV. Versi singkatnya: CV-mu disimpan di browser-mu sendiri, bukan di server kami,
            dan kami tidak memakai pelacakan apa pun.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Tanggal berlaku: 4 November 2026. Kebijakan ini bisa diperbarui sewaktu-waktu mengikuti
            perubahan fitur; tanggal di atas akan disesuaikan bila isinya berubah.
          </p>

          <Section id="ringkasan" title="Ringkasan singkat">
            <p>
              LolosCV tidak punya akun pengguna dan tidak punya database CV. CV dan kunci API AI
              yang kamu isi disimpan di browser perangkatmu (localStorage), jadi datanya ada di
              tempatmu, bukan di server kami. Yang perlu kamu tahu lebih lanjut ada dua: apa yang
              dilewatkan lewat server saat fitur AI dipakai, dan data apa yang tersimpan bila kamu
              berdonasi. Keduanya dijelaskan di bawah.
            </p>
          </Section>

          <Section id="fitur-ai" title="Yang diproses saat kamu memakai fitur AI">
            <p>
              Fitur AI di LolosCV (analisis lowongan, generate isi CV, optimasi, surat lamaran) itu
              opsional dan memakai kunci API milikmu sendiri. Saat kamu menjalankan fitur tersebut,
              isi CV dan kunci API-mu diteruskan sekali lewat server LolosCV (endpoint
              <span className="mx-1 font-mono text-sm">/api/proxy</span>
              ke penyedia AI yang kamu pilih, misalnya OpenAI, Anthropic, atau Google, untuk
              dieksekusi. Permintaan ini tidak disimpan, tidak dicatat, dan tidak dipakai untuk
              analitik apa pun oleh LolosCV.
            </p>
            <p>
              Penyedia AI yang kamu pilih punya kebijakan privasi mereka sendiri atas data yang
              diterimanya. Sebelum memakai fitur AI, periksa kebijakan penyedia AI yang kamu pakai
              agar kamu nyaman dengan cara mereka memperlakukan datamu. Kalau tidak mengaktifkan
              fitur AI, tidak ada satu pun data CV-mu yang keluar dari browser.
            </p>
          </Section>

          <Section id="analisis-link" title="Analisis link lowongan">
            <p>
              Fitur analisis lowongan membaca halaman lowongan dari URL yang kamu tempel. Untuk
              membaca halaman tersebut, URL yang kamu tempel bisa diteruskan ke layanan perantara
              pihak ketiga, yaitu r.jina.ai, corsproxy.io, dan api.allorigins.win, karena
              sebagian situs lowongan tidak bisa diambil langsung dari server kami. Yang diteruskan
              hanya URL lowongannya; LolosCV tidak mengirim data CV-mu ke layanan perantara ini.
            </p>
          </Section>

          <Section id="donasi" title="Donasi">
            <p>
              LolosCV gratis dan donasi via Saweria sepenuhnya opsional. Bila kamu berdonasi dan
              pesannya tampil di leaderboard, nama (atau alias), nominal donasi, dan pesan yang
              kamu tulis disimpan di database key-value Vercel untuk menampilkan leaderboard
              donatur. Alamat email donator hanya dipakai untuk verifikasi pembayaran dan tidak
              disimpan oleh LolosCV.
            </p>
          </Section>

          <Section id="tanpa-pelacakan" title="Tidak ada akun, tidak ada pelacakan">
            <p>
              LolosCV tidak membuatmu mendaftar akun, tidak memasang cookies pelacakan, dan tidak
              memakai Google Analytics atau telemetri pihak ketiga apa pun. Kami tidak bisa
              melacak perjalananmu di situs ini karena memang tidak ada mekanismenya.
            </p>
          </Section>

          <Section id="data-di-browser" title="Data yang tersimpan di browser kamu">
            <p>
              Karena tanpa akun, semua pengaturan dan isian CV disimpan di localStorage browser
              perangkatmu. Berikut daftar kuncinya dan fungsinya masing-masing:
            </p>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <ul className="space-y-3 text-sm leading-relaxed">
                {storageKeys.map((item) => (
                  <li key={item.key}>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                      {item.key}
                    </code>
                    <span className="text-muted-foreground">
                      {" "}
                      : {item.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p>
              Cara menghapus semua data: gunakan tombol &quot;Hapus semua data saya&quot; di dalam
              builder, atau bersihkan data situs untuk LolosCV lewat pengaturan browser-mu. Setelah
              dihapus, tidak ada salinannya di mana pun, karena memang tidak pernah ada salinan di
              server.
            </p>
          </Section>

          <Section id="hak-kamu" title="Hak kamu sebagai subjek data">
            <p>
              Sesuai UU Perlindungan Data Pribadi (UU PDP), kamu punya hak untuk mengakses,
              mengoreksi, dan menghapus data pribadimu. Di LolosCV, semua hak itu bisa kamu jalankan
              langsung dari browser: datanya ada di tempatmu, jadi kamu bisa melihatnya kapan saja,
              mengubahnya di form builder, atau menghapusnya lewat tombol hapus data atau
              pembersihan data situs.
            </p>
            <p>
              Bila ada pertanyaan soal kebijakan ini, hubungi kontak yang tercantum di{" "}
              <Link href="/tentang" className="font-medium text-primary hover:underline">
                halaman Tentang
              </Link>
              .
            </p>
          </Section>

          <Section id="cara-kerja-singkat" title="Alur data secara ringkas">
            <p>Untuk yang suka gamblang, begini alurnya:</p>
            <pre className={preClass}>
              {`Isi CV + kunci AI  ->  disimpan di browser (localStorage), tidak pernah dikirim untuk disimpan
Fitur AI opsional  ->  isi CV + kunci diteruskan SEKALI LEWAT /api/proxy ke penyedia AI pilihanmu,
                       tidak disimpan di server LolosCV
Analisis link      ->  URL lowongan diteruskan ke perantara (r.jina.ai, corsproxy.io,
                       api.allorigins.win) untuk membaca halaman lowongan
Donasi             ->  nama, nominal, pesan disimpan di Vercel KV untuk leaderboard;
                       email hanya untuk verifikasi, tidak disimpan`}
            </pre>
          </Section>

          <div className="mt-14 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            Catatan jujur: kebijakan ini ditulis sesuai perilaku kode yang berjalan saat ini, bukan
            janji. Kalau ada fitur baru yang mengubah aliran data, halaman ini akan diperbarui dan
            tanggal berlakunya disesuaikan.
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
