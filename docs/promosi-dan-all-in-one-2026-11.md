# Strategi Promosi & Roadmap All-in-One — LolosCV (November 2026)

> Dokumen pelengkap [audit-multipearsona-2026-11.md](audit-multipearsona-2026-11.md).
> Fokus: (1) memanfaatkan momentum MagangHub Kemnaker untuk promosi, (2) memperkuat messaging "Rp 0 tetap Rp 0", (3) menutup gap fitur vs kompetitor agar menjadi all-in-one package.
> Prinsip yang tidak bisa dikompromikan: **promosi harus jujur** — audit menunjukkan klaim berlebihan adalah kelemahan terbesar produk ini; jangan menambah klaim baru yang tidak bisa dibuktikan.

---

## 1. Momentum: MagangHub Kemnaker (fakta terverifikasi)

**Yang benar-benar terjadi (per 4 Nov 2026):**
- **MagangHub** (maganghub.kemnaker.go.id) adalah platform resmi Kementerian Ketenagakerjaan untuk **Program Pemagangan Nasional** — menghubungkan fresh graduate dengan 10.000+ perusahaan. Bukan "MaganhHub" — ejaan yang beredar di komunitas sering salah tulis.
- **Batch 3 tahun 2026 resmi dibuka 27 Oktober 2026** — pendaftaran sedang berjalan saat dokumen ini ditulis.
- Dokumen yang disiapkan calon peserta: **KTP, CV, pas foto, ijazah** — CV adalah syarat pendaftaran.
- Kemnaker mengadakan sesi belajar **"CV makin bersinar" pada 12–13 November 2026** — momentum bicara soal CV sedang di puncaknya.
- Konten resmi @maganghub.kemnaker viral di Facebook/Instagram dengan infografis syarat & benefit, menyasar fresh graduate tanpa pengalaman.

**Kenapa ini pas untuk LolosCV:**
- Target MagangHub (fresh graduate, latar bukan IT, HP-first, sensitif biaya) **identik** dengan persona audit yang memberi skor 4/10 — mereka persis pengguna yang ingin dibantu.
- Persyaratan pendaftaran butuh CV yang "bersinar" — dan sesi resminya membicarakan CV. Anginnya dari sisi pemerintah, jalanannya dari LolosCV.
- Kata kunci pencarian sedang naik: "panduan MagangHub", "syarat magang Kemnaker", "contoh CV fresh graduate".

**⚠️ Guardrail yang wajib (jangan dilewati):**
1. **Jangan mengklaim afiliasi, kemitraan, dukungan, atau endorsement dari Kemnaker/MagangHub** — tidak ada. Copy boleh bilang "sejalan dengan Program Pemagangan Nasional" atau "untuk yang siap mendaftar MagangHub Batch 3", TIDAK boleh bilang "CV resmi MagangHub" / "didukung Kemnaker" / memakai logo Kemnaker. Ini risiko hukum (penyalahgunaan nama lembaga negara) plus kehilangan trust kalau ketahuan.
2. **Jangan menyalahartikan deadline** — tulis tanggal apa adanya dan arahkan ke maganghub.kemnaker.go.id untuk info resmi.
3. Semua klaim angka di copy harus bisa dibuktikan; jangan mengarang statistik ("10.000 user LolosCV") yang belum ada.

---

## 2. Posisi Pasar: Senjata Promosi LolosCV

Dari riset 13+ kompetitor (detail di §5), kontras paling kuat yang bisa diiklankan — **dengan syarat perbaikan Fase 0-1 sudah jalan dulu**:

| Klaim promosi | Dasar faktual | Syarat jadi jujur |
|---|---|---|
| "Gratis Rp 0 — diunduh tanpa watermark, tanpa kartu kredit" | Zety ($1,95 trial → $25,95/4 minggu), Resume.io (TXT saja gratis), Enhancv (watermark) mengunci unduhan di paywall | Fix 3 bug PDF dulu (nama file seragam, print dark mode, huruf semut) — kalau tidak, PDF gratis yang buruk lebih memalukan daripada paywall |
| "Tanpa daftar akun, tanpa aplikasi" | Semua platform lokal (Karir.com, JobStreet, Glints, KitaLulus, Cake, Kinobi) wajib signup | Sudah benar sekarang |
| "CV-nya ramah ATS, bukan cuma cantik" | ~72% template Canva gagal parsing ATS (multi-kolom, text box); LolosCV single-column text-based sejak lahir + skor kecocokan gratis | Ganti copy "Lolos Seleksi ATS" → "Ramah ATS" (audit 3.3.3); jangan janji "pasti lolos" |
| "Data CV-mu tinggal di browsermu, bukan di server kami" | Local-first + zero analytics + tanpa signup | **Wajib revisi klaim privasi dulu** (audit 3.3.1 — saat ini transit via proxy) + halaman `/privacy` — jangan promosi dengan klaim yang belum akurat |
| "Dibedah sesuai lowongan yang kamu lamar" | Job analyzer (URL LinkedIn/JobStreet/Glints → ekstraksi → CV menyesuaikan) **tidak ada padanannya di pasar ID** — Karir.com/Glints/KitaLulus hanya generate dari profil | Harus bisa dipakai tanpa API key dulu (demo-first, audit 3.1) |
| "Rp 0 tetap Rp 0" | Tanpa paywall, tanpa trial, tanpa auto-charge | Copy harus jujur soal AI: fitur AI opsional pakai kunci sendiri (ada panduan gratis via Google AI Studio) atau mode demo |

**Posisi satu kalimat:** *Satu-satunya paket lamaran lengkap Indonesia (CV ramah ATS + surat lamaran + analisis lowongan lokal) yang gratis 0 rupiah, tanpa akun, tanpa watermark, dan bisa dipakai dari HP.*

---

## 3. Strategi Promosi

### 3.1 Urutan yang benar (critical!)

```
Fase 0 audit (≤1 hari kerja)
   ↓  ← JANGAN promosi sebelum ini: fix PDF, fix data-loss, fix klaim privasi
Pasang banner MagangHub + copy baru (1 hari)
   ↓
Kampanye sosial mulai 9-10 November
   ↓  ← peak momentum 12-13 Nov (sesi "CV makin bersinar")
Sepanjang periode pendaftaran Batch 3 (nov-des)
```

Mengapa urutannya tidak bisa dibalik: promosi membawa gelombang user baru; audit menunjukkan gelombang pertama sekarang sudah tersandung di menit ke-2 (tembok API key) dan berisiko kehilangan data. Membawa 10x traffic ke funnel yang bocor = membakar momentum terbesar yang mungkin hanya sekali terjadi.

### 3.2 Kanal (urut dampak per effort, solo-dev)

1. **SEO halaman landing + kampanye** (effort terendah, jangka panjang): banner MagangHub di hero, FAQ baru, meta/FAQ JSON-LD diperbarui — menangkap pencarian "contoh CV magang", "CV fresh graduate", "CV ATS gratis".
2. **Instagram/TikTok organik** — konten infografis ala @maganghub.kemnaker: "3 kesalahan CV yang bikin gugur sebelum dibaca HRD" + CTA ke LolosCV. Format: carousel IG + video 15-30 dtk TikTok/Reels (hook di 2 detik pertama).
3. **Komunitas** — share di grup Telegram/WhatsApp/LinkedIn pencari kerja & kampus (bukan spam: kontribusi tips dulu, link sebagai solusi). Grup pendaftar MagangHub sedang ramai.
4. **Word of mouth via fitur** — nama file PDF yang benar ("Budi - Admin Operations.pdf") adalah iklan bawaan; tambahkan opsi "dibuat dengan LolosCV" opsional di footer CV (default OFF, user pilih sendiri).
5. **Leaderboard donatur** (sudah ada) — tunjukkan bahwa donasi = dukungan pengembangan, bukan paywall tersembunyi.

### 3.3 Messaging inti kampanye

- **Utama:** "Siapkan CV-mu untuk MagangHub Batch 3 — gratis, tanpa akun, 15 menit dari HP."
- **Diferensiasi vs paywall:** "CV-mu diunduh gratis, tanpa watermark, tanpa kartu kredit."
- **Diferensiasi vs Canva:** "Seindah apa pun, kalau gugur di ATS sama saja."
- **Diferensiasi vs platform lokal:** "Tanpa daftar akun. CV-mu tinggal di HP-mu."
- **Anti-paywall guard:** "Kalau nanti ada yang minta bayar — itu bukan LolosCV."
- **Donasi:** "Gratis selamanya. Kalau terbantu dan mau mendukung pengembangnya, traktir kopi lewat Saweria — namamu tampil di leaderboard. Wajib? Sama sekali tidak."

---

## 4. Draft Copy Siap Pakai

> Semua copy di bawah mengikuti prinsip: jelas > puitis, manfaat > fitur, spesifik > vague, bahasa user, dan TIDAK mengklaim afiliasi Kemnaker.

### 4.1 Banner kampanye MagangHub (hero, di atas headline — dapat ditutup)

**Versi A (rekomendasi):**
> 🎯 Lagi siap daftar **Magang Kemnaker Batch 3**? Bikin CV yang benar-benar dibaca —
> gratis, tanpa akun, langsung dari HP. [Buat CV-nya Sekarang] [Lihat Panduan]

**Versi B:**
> Pendaftaran Magang Kemnaker Batch 3 sudah dibuka — CV-mu sudah siap?
> Siapkan CV ATS-friendly gratis di sini, 15 menit dari HP. [Mulai Bikin CV]

**Anotasi:** menyebut "Magang Kemnaker Batch 3" sebagai *konteks waktu*, bukan afiliasi; tombol utama bertindak (action-oriented), bukan "Learn More". Banner harus punya tombol tutup (×) dan jangan menutupi CTA utama.

### 4.2 Hero headline — alternatif (ganti "Buat CV yang Lolos Seleksi ATS" yang overselling)

- **Opsi A (rekomendasi):** "CV Ramah ATS, Dibuat 15 Menit, Gratis Rp 0" — spesifik, angka, janji yang bisa dibuktikan.
- **Opsi B:** "Bikin CV yang Benar-Benar Dibaca HRD" — manfaat akhir, bahasa target.
- **Opsi C:** "CV ATS-Friendly Gratis — Tanpa Akun, Tanpa Watermark" — kontras langsung dengan paywall.

Sub-headline (rekomendasi):
> Tempel link lowongan dari LinkedIn, JobStreet, atau Glints — LolosCV bantu susun CV yang menjawab kebutuhan lowongan itu. Semua fitur utama gratis Rp 0, tanpa daftar akun, unduh PDF tanpa watermark. Fitur AI opsional pakai kunci milikmu sendiri — ada panduan, atau pakai mode demo dulu.

**Anotasi:** kalimat terakhir menutup celah jujur yang ditemukan audit (janji "gratis" vs kenyataan BYOK) TANPA menghilangkan daya tarik.

### 4.3 Section baru: "Rp 0 tetap Rp 0" (dipasang dekat pricing)

> ### Gratis. Bukan trial. Bukan freemium jebakan.
> Banyak builder CV mengunci unduhan PDF-mu di balik trial $1,95 yang auto-perpanjang $25/bulan. Di sini tidak ada itu.
>
> - **Rp 0 untuk semua fitur utama** — builder, 4 template, unduh PDF tanpa watermark, cek kecocokan kata kunci.
> - **Tanpa kartu kredit, tanpa "masa percobaan", tanpa akun.**
> - **Data CV-mu tersimpan di browser-mu sendiri** — bukan di server kami, tidak dijual, tidak dipakai iklan.
> - **Kalau terbantu dan mau dukung pengembangnya** — traktir kopi via Saweria. Opsional 100%, namamu tampil di leaderboard donatur.
>
> Satu-satunya hal yang bisa berbiaya: kalau kamu aktifkan fitur AI dengan kunci API milikmu sendiri — dan itu dibayar langsung ke penyedia AI-nya, bukan ke kami. Belum punya? Panduan kunci gratis ada di dalam, atau pakai mode demo dulu.

**Anotasi:** section ini sekaligus menjawab keberatan #1 persona Sari ("nanti diminta bayar nggak ya?") dengan bahasa yang dia kenal (Canva/trial traps), dan menuntaskan kewajiban kejujuran audit 3.3.7.

### 4.4 FAQ baru (tambah ke JSON-LD & halaman)

1. **Q: LolosCV benar-benar gratis?** — Ya. Semua fitur utama Rp 0, tanpa trial, tanpa watermark, tanpa kartu kredit. Kalau terbantu, donasi via Saweria sepenuhnya opsional.
2. **Q: Apakah LolosCV bagian dari Kemnaker atau MagangHub?** — Tidak. LolosCV independen dan tidak berafiliasi dengan Kemnaker maupun MagangHub. Untuk info resmi pendaftaran magang, selalu cek maganghub.kemnaker.go.id. LolosCV hanya membantu menyiapkan CV-nya.
3. **Q: Apakah CV saya bisa diunduh gratis sebagai PDF?** — Ya, tanpa watermark dan tanpa batas unduhan. Tips: di dialog yang muncul, pilih tujuan "Save as PDF / Simpan sebagai PDF".
4. **Q: Apakah datanya aman?** — CV-mu tersimpan di browser perangkatmu. Saat kamu pakai fitur AI opsional, isi CV diteruskan sekali lewat server kami ke penyedia AI pilihanmu — tidak disimpan, tidak dicatat. Rincian di [Kebijakan Privasi](/privacy).
5. **Q: Perlu akun?** — Tidak perlu. Buka, isi, unduh. Data tersimpan otomatis di browser-mu (jangan bersihkan riwayat/browser di perangkat itu sebelum unduh atau simpan file proyek).
6. **Q: Saya fresh graduate tanpa pengalaman kerja — cocok?** — Cocok. Ada contoh CV khusus fresh graduate (organisasi, magang, proyek), dan fitur analisis lowongan membantu menyesuaikan CV dengan persyaratan yang ditulis perusahaan.

### 4.5 Posting media sosial (siap posting)

**Instagram/TikTok carousel (caption):**
> Cv-mu udah siap buat Magang Kemnaker Batch 3? 📄
>
> 3 alasan CV sering gugur sebelum dibaca HRD:
> 1. Format berantakan di mata mesin penyaring (ATS)
> 2. Isinya "bertanggung jawab atas..." tanpa hasil terukur
> 3. Huruf kecilnya kayak semut 3pt
>
> Semua itu bisa diperbaiki 15 menit — gratis, dari HP, tanpa daftar akun.
> Link di bio. #MagangHub #MagangKemnaker #CVATS #FreshGraduate

**TikTok/Reels hook (script 15-30 dtk):**
> [Hook 0-2 dtk, tutup layar]: "Kalau CV-mu namanya masih 'LolosCV - Buat CV...pdf' — jangan kirim dulu." → [rekap masalah] → [demo: tempel link lowongan, CV terbentuk, unduh] → [CTA]: "Gratis, tanpa akun — cek bio."
> *(Catatan: hook ini jadi benar setelah fix `document.title` Fase 0 — sebelum itu, semua user memang punya nama file itu 😅)*

**LinkedIn post:**
> Pendaftaran Magang Kemnaker Batch 3 baru saja dibuka — dan di sinilah CV fresh graduate paling banyak terseleksi otomatis oleh ATS sebelum dibaca manusia.
>
> Saya membangun LolosCV (gratis, tanpa akun, tanpa watermark) untuk satu alasan: membuat CV yang menjawab lowongan tertentu seharusnya tidak butuh kartu kredit atau langganan bulanan.
>
> Tempel link lowongan → analisis persyaratan → susun CV yang menjawabnya → unduh PDF. Semua gratis.
>
> 🌐 loloscvats.web.id — masukan & kritik sangat saya terima.

**WhatsApp broadcast (grup komunitas/kampus):**
> Halo! Yang lagi daftar magang Kemnaker batch 3 — CV-nya udah siap? Ada tool gratis bikin CV ATS-friendly tanpa daftar akun, bisa dari HP: www.loloscvats.web.id. Tempel link lowongannya, langsung dibedah persyaratannya. Gratis 100%, kalau suka bisa traktir dev-nya via Saweria (opsional). Semoga lolos! 🙏

### 4.6 Meta/SEO

- Title: `LolosCV — Bikin CV ATS-Friendly Gratis (Tanpa Akun, Tanpa Watermark)`
- Description: `Bikin CV profesional gratis Rp 0, tanpa daftar akun, unduh PDF tanpa watermark. Tempel link lowongan LinkedIn/JobStreet/Glints — CV disesuaikan dengan persyaratannya. Siap untuk Magang Kemnaker & lamaran kerja pertama.`
- Tambah FAQ 4.4 ke JSON-LD FAQPage di `layout.tsx` (FAQ #2 penting sebagai penangkal penyalahartian afiliasi di hasil pencarian).
- Jangan memasukkan kata "Kemnaker"/"MagangHub" ke dalam title/keywords metadata sebagai klaim asosiasi — cukup di konten dengan framing konteks (FAQ #2 menjelaskan). Ini menjaga jarak hukum sambil tetap menangkap pencarian.

---

## 5. Gap Fitur vs Kompetitor → All-in-One

Riset 13+ kompetitor (8 global: Canva, Zety, Resume.io, Novoresume, FlowCV, Rezi, Enhancv, Kickresume, Teal; 5+ lokal: Karir.com, JobStreet, Glints, KitaLulus, Cake, Kinobi, Dealls). Poin kunci:

**Yang sudah unik di LolosCV (jangan diragukan, ini senjata):**
- Analisis lowongan → CV menyesuaikan: TIDAK ada padanan di pasar Indonesia.
- Unduh PDF gratis tanpa watermark (vs paywall trap Zety/Resume.io/Enhancv).
- Tanpa signup (vs semua platform lokal wajib akun).
- ATS-native single-column (vs ~72% template Canva gagal parsing ATS).
- Privacy-first local-first + BYOK.

**Gap yang harus ditutup (urut dampak vs effort, konteks pasar ID — surat lamaran hampir wajib, user mobile-first, sensitif biaya):**

| Tier | Fitur | Effort | Kenapa penting |
|---|---|---|---|
| **Quick Win (<2 hari)** | Surat lamaran generator (versi teks→PDF) | 2-3 hari | Lampiran wajib lamaran di Indonesia; 8/8 builder global punya; reuse `job_analysis` + `resume_data` + infra BYOK yang sudah ada |
| | Export/import JSON | 1 hari | Pengganti "akun" yang paling murah; pindah device & backup |
| | Field lokal: TTL, expected salary, penempatan + validasi `+62` | 1 hari | Standar CV Indonesia; tidak ada builder global yang punya = diferensiasi |
| | Fix PDF (Fase 0) | 1 hari | Prasyarat semua klaim "PDF gratis berkualitas" |
| | Halaman `/privacy` + `/terms` | 0,5-1 hari | Prasyarat klaim privasi di promosi |
| **Mid (1-2 minggu)** | Cover letter builder + template visual tersinkron CV | 1-2 minggu | Menjadi paket lamaran lengkap |
| | Multi-slot CV (2-5 versi: "CV_Admin", "CV_Magang") | 2-3 hari | Semua saingan berbayar menjual ini; lokal cukup localStorage namespacing |
| | Import LinkedIn via export PDF profil | 2-3 hari | Jalur pdfjs sudah ada; jangan fetch profil (melanggar ToS LinkedIn) |
| | Job tracker lokal (status lamaran) | 1 minggu | KitaLulus/Karir.com menang di sini; localStorage + import otomatis dari job analyzer |
| | Mobile wizard/stepper + sticky unduh | 1-2 minggu | Audit 3.6 — KitaLulus menang di HP, LolosCV kalah parah |
| | Template segmen lokal (fresh graduate, BUMN foto+TTL, admin) | 1 minggu | Butuh refactor dedup template dulu (audit Fase 2) agar template baru murah |
| | Halaman SEO per-fitur & contoh ("contoh surat lamaran admin", "CV fresh graduate tanpa pengalaman") | 1 minggu | Cake/Dealls/JobStreet menang organic search di ID |
| | PWA installable | 2-3 hari | Menyaingi "aplikasi" KitaLulus tanpa native app |
| **Big Bet (>2 minggu)** | Sync opsional antar device (device code/QR, KV terenkripsi E2E) | 2-4 minggu | Mengisi gap "akun" TANPA mengorbankan "tanpa signup" — tetap opsional |
| | Native PDF export (jsPDF) | 2-3 minggu | Meniadakan dialog print (komplain #1 output) |
| | Preset industri + pustaka konten per bidang | 2 minggu | Konten, bukan kode — dengan guard anti-fabrikasi |

**Yang TIDAK perlu ditiru (jaga fokus):** portfolio hosting ala Kickresume (butuh backend, segmen kecil), AI mock interview, ekstensi browser auto-apply (rapuh + ToS), job board sendiri, "who viewed your resume", expert review manusia, AI headshot, cloud CRUD penuh.

---

## 6. Integrasi dengan Roadmap Audit (Fase 0-3)

Urutan eksekusi gabungan yang disarankan:

**Fase 0 (minggu ini, ≤1-2 hari)** — tanpa perubahan dari audit, ditambah:
- [x] Semua item Fase 0 audit (fix PDF × 3, fix data-loss, fix webhook, maxDuration, dll.)
- [ ] **Pasang banner MagangHub** (copy §4.1) + FAQ #2 anti-afiliasi
- [ ] Ganti headline hero ke Opsi A/B/C (§4.2) + sub-headline jujur

**Fase 1 (bulan ini)** — dari audit, prioritas diurutkan ulang karena kampanye:
1. Demo-first flow + panduan API key (mengapa #1: kampanye membawa user non-IT)
2. Halaman `/privacy` + `/terms` (mengapa naik: prasyarat klaim promosi)
3. Revisi klaim privasi + section "Rp 0 tetap Rp 0" (§4.3)
4. Mock persona fresh graduate + default bahasa `id`
5. **Surat lamaran generator v1** (fitur baru — dampak pasar terbesar)
6. Export/import JSON + indikator autosave
7. Fix bahasa UI + error Indonesia + detector placeholder
8. Mobile wizard + sticky unduh (bisa geser ke awal Fase 2 bila sempit)
9. Keamanan: allowlist proxy, rate limit KV, Sentry, CI (tetap wajib, non-tampak)

**Fase 2 (kuartal ini)** — dari audit ditambah:
- [x] Item audit Fase 2 (refactor zustand/zod/split api.ts, import tanpa API, streaming, a11y, i18n dict, IndexedDB foto, CSP, test suite)
- [ ] Cover letter builder visual + template tersinkron
- [ ] Multi-slot CV
- [ ] Job tracker lokal
- [ ] Import LinkedIn PDF
- [ ] Template segmen lokal (setelah dedup template)
- [ ] Halaman SEO per-fitur/contoh (`/fitur`, `/faq`, halaman contoh)
- [ ] PWA

**Fase 3** — dari audit ditambah: sync opsional terenkripsi, native PDF export, preset industri.

**Kampanye sosial** mulai setelah Fase 0 + banner live (target: 9-10 November, peak 12-13 Nov sesi "CV makin bersinar", lanjut sepanjang pendaftaran Batch 3). Jalankan sesuai §3.2 dan §4.5.

---

## 7. Risiko & Guardrail

1. **Hukum/afiliasi:** tidak ada klaim kemitraan Kemnaker; FAQ #2 + disclaimer di banner. Cek kata-kata copy sebelum publish: tidak ada "resmi", "didukung oleh", "kerja sama dengan".
2. **Klaim privasi sebelum fix:** jangan promosi "data tinggal di browsermu" SEBELUM copy features.tsx diperbaiki dan `/privacy` live — audit menunjukkan klaim itu belum akurat.
3. **Klaim ATS:** gunakan "ramah ATS / mudah dibaca mesin", bukan "pasti lolos ATS". Skor tetap direbrand "Skor Kecocokan Lowongan" (audit 3.3.3).
4. **Kapasitas:** satu proxy serverless tanpa auth + rate limit lemah (audit S2/S3) — kalau kampanye sukses besar, endpoint `/api/proxy` bisa diabuse tepat saat traffic tinggi. **Fix keamanan Fase 0-1 bukan opsional sebelum kampanye.**
5. **Ekspektasi AI:** kampanye menarik user non-IT yang tidak akan punya API key — demo-first harus sudah jalan, kalau tidak, gelombang baru akan menyerah di menit ke-2 (persis temuan persona).
6. **Sekali tempel, permanen:** copy yang di-screenshot dan disebar (lebih cepat dari perbaikan) — jadi publish hanya copy yang sudah dicek jujur.

---

## Sumber

- [MagangHub Kemnaker (situs resmi)](https://maganghub.kemnaker.go.id) — pendaftaran Batch 3 dibuka 27 Okt 2026; syarat dokumen termasuk CV
- [Panduan pendaftaran MagangHub 2026 (akbara.ac.id)](https://www.akbara.ac.id/panduan-lengkap-cara-daftar-maganghub-kemnaker-2026)
- [MAGENTA Kemnaker (magentaku.id)](https://magentaku.id)
- Kompetitor: [resume.io/pricing](https://resume.io/pricing) · [flowcv.com/pricing](https://flowcv.com/pricing) · [enhancv.com/pricing](https://enhancv.com/pricing) · [kickresume.com/en/pricing](https://kickresume.com/en/pricing) · [tealhq.com](https://www.tealhq.com) · [kitalulus CV builder](https://id.kitalulus.com/cv-builder) · [cake.me templates](https://www.cake.me/resume-templates?locale=id) · [cvbuilder.id](https://cvbuilder.id) · [dealls.com/cv-reviewer](https://dealls.com/cv-reviewer) · [karir.com](https://karir.com)
- Konteks surat lamaran Indonesia: [JobStreet career advice](https://id.jobstreet.com/id/career-advice/article/email-adalah)
- Audit internal: [audit-multipearsona-2026-11.md](audit-multipearsona-2026-11.md)

*Disusun 4 November 2026. Harga & fitur kompetitor per tanggal riset — verifikasi ulang sebelum dipakai sebagai materi perbandingan publik.*
