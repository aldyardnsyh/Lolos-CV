# Audit Multi-Persona LolosCV — November 2026

> Dokumen ini adalah hasil audit komprehensif terhadap https://www.loloscvats.web.id (repo `bangun-resume-ai`)
> yang disusun dari 7 persona independen: 3 user awam, 2 HR/rekruter, dan 2 engineer.
> Setiap persona menelusuri live site + kode sumber, lalu temuan disintesis lintas persona.
> **Tujuan:** menjadi sumber kebenaran (single source of truth) untuk roadmap perbaikan UX, fungsionalitas, dan infrastruktur.
>
> **Dokumen pelengkap:** [promosi-dan-all-in-one-2026-11.md](promosi-dan-all-in-one-2026-11.md) — strategi promosi momentum MagangHub Kemnaker, draft copy siap pakai ("Rp 0 tetap Rp 0"), dan gap fitur vs kompetitor menuju all-in-one.
> **Dokumen pelengkap:** [seo-plan-2026-11.md](seo-plan-2026-11.md) — rencana SEO & share card: kondisi terverifikasi, fix kartu Google, halaman konten untuk keyword "contoh cv ats / template cv ats / cv ats friendly", roadmap S0-S3.

---

## 1. Ringkasan Eksekutif

| Persona | Skor | Satu kalimat |
|---|---|---|
| Rina (22, fresh graduate, HP-first) | **4/10** | "Pintu depannya dibangun untuk engineer — saya menyerah di menit ke-2 di tembok 'API key', padahal demo yang saya butuhkan sudah ada di dalam, cuma tidak pernah ditunjukkan." |
| Pak Budi (35, career switcher, upload PDF) | **4/10** | Import PDF gagal di menit pertama dengan error Inggris `"API not configured."`, lalu satu klik "Generate Sample CV" dari analyzer **menghapus CV aslinya tanpa konfirmasi**. |
| Sari (28, 100% mobile) | **4/10** | "Canva aja bisa, kok ini ribet?" — form 11 section bahasa Inggris, maraton scroll, tombol unduh tersembunyi di bawah, berakhir di dialog printer, bukan file PDF. |
| Bu Dewi (recruiter agency, penerima CV) | **6/10** | PDF-nya text-based dan bisa diparse ATS (bagus!), tapi **semua kandidat mengirim file bernama sama**, ada bug cetak dark mode yang bisa menghasilkan PDF kosong, dan "padatkan 1 halaman" default ON membuat CV huruf semut. |
| Pak Agus (TA Lead, penerima CV + kepatuhan) | **7/10** tool, **4/10** "mau kandidat saya pakai" | Fondasi anti-fabrikasi dan SSRF-nya serius, tapi klaim privasi tidak akurat, **tidak ada halaman privasi/TOS sama sekali** (UU PDP), dan BYOK hanya sanggup diakses <5% kandidat Indonesia. |
| Frontend engineer | **5.5/10** | God component 2900 baris, sinkronisasi via `window.CustomEvent` tanpa tipe, autosave per keystroke tanpa debounce, dan **jalur data-loss asimetris** antara builder vs analyzer. |
| Full-stack & security engineer | **6/10** security, **5/10** arsitektur | "Aman dari serangan klasik, rapuh terhadap abuse dan kegagalan senyap" — auth bypass di webhook Saweria, proxy tanpa autentikasi nyata, LLM call 180s tanpa `maxDuration` yang pasti dipenggal Vercel. |

### 5 Konsensus Utama (semua persona sependapat)

1. **Tembok API key adalah pembunuh konversi #1.** Fitur inti (analisis lowongan, generate, translate, import PDF via AI) terkunci di belakang API key yang tidak dijelaskan apa itu, cara mendapatkannya, atau harganya — padahal landing menjanjikan "Gratis Rp 0 selamanya, tanpa syarat". Mode demo/fallback **sudah ada dan bekerja** tapi tidak pernah ditawarkan.
2. **Ada jalur data-loss nyata.** "Generate Sample CV" dari `job-analyzer.tsx` menimpa seluruh CV user **tanpa konfirmasi dan tanpa backup** (jalur di dalam builder punya konfirmasi+backup+undo, jalur analyzer tidak). Ditambah `safeLocalSet` menelan `QuotaExceededError` diam-diam (foto base64 2MB bisa memicunya) — autosave bisa gagal tanpa user tahu.
3. **Klaim privasi tidak akurat dan tidak ada halaman legal.** Landing bilang "Data tidak dikirim ke server kami" padahal semua panggilan AI (CV utuh + API key) transit via `/api/proxy`. Tidak ada `/privacy`, `/terms`, about, atau kontak. Risiko UU PDP nyata.
4. **Kualitas output PDF punya 3 bug fatal:** semua file PDF bernama `"LolosCV - Buat CV yang Lolos Seleksi ATS (Gratis).pdf"` (document.title tidak pernah diubah sebelum print), bug dark mode bisa mencetak teks putih di kertas putih (CV "kosong" di mata recruiter), dan `compactOnePage` default ON dengan floor zoom 50% menghasilkan font ~5px.
5. **Konten mock/demo salah sasaran:** persona Software Engineer berbahasa Inggris ("Budi Santoso", Docker/AWS) untuk pasar lamaran Indonesia; perusahaan placeholder "PT Contoh Sukses Abadi" bisa lolos ke CV asli; demo ATS menampilkan keyword "Docker, Kubernetes" ke pelamar admin/logistics.

---

## 2. Metodologi

- **7 persona** dijalankan sebagai agent independen secara paralel, masing-masing diberi skenario tugas spesifik.
- Setiap persona: (1) mem-fetch live site untuk copy asli, (2) membaca kode sumber untuk merekonstruksi pengalaman nyata, (3) menjalankan skenario langkah-demi-langkah, (4) menghasilkan laporan ber-bukti (`file:line`).
- Persona:
  - **User awam:** Rina (fresh graduate, IG-first), Pak Budi (career switcher, punya CV PDF lama, sabar 5 menit), Sari (admin EO, 100% HP, skeptis freemium).
  - **HR/Rekruter:** Bu Dewi (recruiter agency, screening 150+ CV/hari, 10-15 detik per CV), Pak Agus (TA Lead in-house tech, ATS Greenhouse/Karir.com/Lovectin, peduli UU PDP & kejujuran kandidat).
  - **Engineer:** senior frontend engineer (arsitektur, state, a11y, performa), full-stack & security engineer (SSRF, webhook, rate limit, Vercel timeout, CI/test/monitoring).

---

## 3. Temuan Lintas Persona (Sintesis per Tema)

### 3.1 Tembok API Key & Onboarding `[KRITIS — konsensus 3 awam + TA lead]`

| Temuan | Bukti |
|---|---|
| Fitur andalan menolak tanpa key dengan pesan yang tidak bisa dipahami awam | `job-analyzer.tsx:67-71` — "API belum dikonfigurasi. Silakan isi API Key di menu Konfigurasi API terlebih dahulu." |
| Import PDF gagal SETELAH file berhasil dibaca, dengan error bahasa Inggris mentah | `cv-uploader.tsx:72` → `api.ts:1597-1599` — `throw new Error("API not configured.")` |
| Tidak ada penjelasan apa itu API key, cara dapat, perkiraan biaya | `api-settings.tsx:230` — "API key dari penyedia yang kamu miliki" (asumsi user sudah punya) |
| "Cara Kerja" menjadikan langkah 1 = "Hubungkan API" | `how-it-works.tsx:8-9` |
| Mode demo/fallback ada dan bekerja tapi tidak pernah ditawarkan; tidak ada CTA "coba tanpa API key" di hero/navbar/error | `sample-mock.ts`, `resume-builder.tsx:526-556`, `job-analyzer.tsx:140-147` |
| Jargon bertubi: Provider, auto-detect, "Muat Live", Base URL, "OpenAI-compatible", "Reasoning Effort", "XMax (Ekstrim)" | `api-settings.tsx:17-23, 377, 420, 490-497` |
| Ritual simpan terkunci di belakang "Tes Koneksi" tanpa indikasi jelas | `api-settings.tsx:208` (`canSave = canTest && testResult === true`), teks bantu kecil abu-abu di `:540` |
| Istilah "ATS" tidak pernah dijelaskan dengan bahasa awam di seluruh halaman | hero `hero.tsx:29-32` |
| Copy-paste API key di HP menyiksa; tidak ada wizard/panduan mobile-friendly | `api-settings.tsx:283-295` |

**Saran terkonsolidasi:**
1. Demo-first: CTA sekunder di hero + di setiap pesan error — **"Coba Dulu Tanpa API Key (Gratis)"**.
2. Blok "Apa ini?" berbahasa awam di section API: "Fitur pintar ini butuh 'kunci' dari layanan AI. Butuh 10 menit, mulai dari Rp 0 (Google AI Studio / Groq free tier). Belum punya? Pakai mode demo dulu." + panduan ber-screenshot 3 langkah.
3. Dua mode api-settings: **Mode Mudah** (paste key → satu tombol "Sambungkan" yang auto-detect+tes+simpan) dan **Mode Lanjutan** (pengaturan sekarang). Sembunyikan Reasoning Effort/Base URL/XMax dari mode mudah.
4. Jelaskan ATS sekali di hero: "ATS = aplikasi penyaring CV otomatis yang dipakai perusahaan sebelum HRD membaca lamaranmu."

### 3.2 Jebakan Data Loss & Persistensi `[KRITIS — konsensus 2 awam + frontend + security]`

| Temuan | Bukti |
|---|---|
| **"Generate Sample CV" dari analyzer menimpa CV user tanpa konfirmasi/backup** | `job-analyzer.tsx:134-141` langsung `dispatchEvent("resume_data_updated")` → `resume-builder.tsx:425-437` hanya `setResume` → `:443-445` autosave menimpa localStorage. Jalur internal builder (`:347-382`) PUNYA modal konfirmasi + backup `resume_data_before_generate` + tombol "Urungkan". Jalur `ats-optimizer.tsx:141-151` juga lolos. |
| Backup `resume_data_before_optimize` **write-only** — undo yang dijanjikan tidak pernah bisa dilakukan | `ats-optimizer.tsx:147` menulis; key ini tidak pernah dibaca di mana pun |
| `safeLocalSet` menelan semua error termasuk `QuotaExceededError` → autosave gagal senyap | `api.ts:21-25` (`catch {}`) |
| Foto base64 hingga 2MB disimpan di `resume_data` → mendekati kuota localStorage ~5MB (plus 2 salinan backup = 3×2.7MB) | `resume-builder.tsx:558-568, 443-445, 358` |
| Autosave `JSON.stringify` seluruh resume **per ketikan, tanpa debounce** | `resume-builder.tsx:443-445` |
| Race condition mount: persist efek jalan sebelum load selesai → jendela `resume_data` tertimpa string kosong; dua tab saling menimpa (last-writer-wins, tidak ada listener `storage`) | `resume-builder.tsx:384-441` vs `443-445` |
| localStorage-only: ganti device = data hilang; tidak ada export/import JSON | hanya ada PDF export; satu-satunya `FileReader` adalah foto (`resume-builder.tsx:565`) |
| Autosave bekerja baik tapi user tidak pernah diberi tahu → takut refresh | tidak ada indikator "Tersimpan otomatis" (yang ada hanya untuk Section Order, `resume-builder.tsx:2797`) |
| Hasil analisis lowongan tersimpan (`job_analysis`) tapi kartu hasil tidak direstorasi saat mount → tampak hilang | `job-analyzer.tsx` state `result` tidak dimuat saat mount |

**Saran terkonsolidasi:**
1. **Samakan perlindungan semua jalur destruktif:** sebelum menimpa via event, cek `isResumeEmpty`; bila berisi → tampilkan dialog konfirmasi yang sama + tulis backup + sediakan undo. Paling bersih: pindahkan ke satu store action (`replace()` di store) yang memaksa konfirmasi+backup sehingga tidak mungkin ada jalur yang lolos.
2. `safeLocalSet` → return boolean; tampilkan toast "Penyimpanan browser penuh — data terbaru TIDAK tersimpan" saat gagal.
3. Debounce autosave 400-800ms + flush di `beforeunload`.
4. Kompres foto ke ≤200-300KB via canvas atau pindahkan ke IndexedDB.
5. Tombol **"Simpan data ke file / Muat dari file"** (export/import JSON) + chip "Tersimpan otomatis di browser ini" + tombol "Hapus semua data saya".
6. Restorasi kartu hasil analisis saat mount.

### 3.3 Kejujuran Klaim & Trust `[KRITIS — konsensus 3 awam + 2 HR]`

| Temuan | Bukti |
|---|---|
| Klaim privasi tidak akurat: "Data tidak dikirim ke server kami" padahal semua panggilan AI (CV utuh + API key) transit via `/api/proxy` | `features.tsx:53-54` vs `api.ts:325-331` (`proxyFetch`), `proxy/route.ts:156-171` |
| Tidak ada `/privacy`, `/terms`, `/about`, kontak — 0% pemberitahuan UU PDP Pasal 20-21 | struktur `src/app/` + `footer.tsx` tanpa satu pun link legal |
| URL lowongan user diteruskan ke 3 layanan pihak ketiga (r.jina.ai, corsproxy.io, allorigins) tanpa pemberitahuan | `fetch-url/route.ts:146-149, 316-319` |
| Pricing mengiklankan "Analisis lowongan tanpa batas" tanpa menyebut syarat API key (yang bisa berbayar) | `pricing.tsx:8-15` vs kenyataan BYOK |
| Klaim "Buat CV yang Lolos Seleksi ATS" overselling; skor ATS dihitung dari JSON data (bukan PDF yang dikirim) dan keyword-token overlap sederhana (`overlap / jobKw.size * 100 * 2`) | `hero.tsx:29-32`; `api.ts:1296, 1310-1315` |
| Demo ATS menampilkan skor 72 + keyword "Docker, Microservices, GraphQL, Terraform, Kubernetes" ke semua user (bisa dianggap skor nyata dan di-screenshot ke LinkedIn) | `ats-optimizer.tsx:16-41, 176-184` |
| Fallback mock analysis menandai SEMUA key point `importance: "critical"` → badge "WAJIB" merah semua → mendorong keyword-stuffing | `ats-optimizer.tsx:103-111` |
| Footer sosial link mati → github.com/twitter.com/instagram.com/linkedin.com domain kosong = "project ditinggalkan" di mata profesional | `footer.tsx:80-85` |
| Mock CV memakai nama institusi nyata ("Universitas Indonesia", "SMA Negeri 1 Jakarta") + pencapaian karangan → risiko CV hallucinated masuk inbox recruiter | `sample-mock.ts`, prompt `api.ts:1552-1595` |
| Satu jalur generate tanpa guard anti-fabrikasi | `generateResumeContent` `api.ts:1512-1525` — tanpa "jangan mengarang", tanpa `preserveOriginalFacts` (yang justru dipakai ketat di jalur optimasi `:1401-1510`) |

**Saran terkonsolidasi:**
1. Revisi copy jadi akurat & tetap menjual: *"API key dan data CV kamu disimpan hanya di browser. Permintaan AI diteruskan lewat server kami ke penyedia AI pilihanmu — tidak disimpan, tidak dicatat."*
2. Buat `/privacy` + `/terms` statis (apa yang transit, ke mana, retensi, hak subjek data + kontak), daftarkan di sitemap. Tutup ~70% eksposur UU PDP.
3. Rebrand "Skor ATS" → **"Skor Kecocokan Lowongan"** + disclaimer: "Estimasi kecocokan kata kunci. ATS nyata (Greenhouse/Taleo) tidak memberi skor dan menilai struktur, bukan hanya keyword."
4. Saat mode demo ATS: gunakan keyword dari lowongan tersimpan, atau disclaimer besar "Ini contoh dengan data lain — bukan skormu". Kunci export PDF bila data masih mengandung placeholder mock.
5. Tambah guard anti-fabrikasi ke `generateResumeContent` (prompt + filter subset seperti `preserveOriginalFacts`).
6. Perbaiki footer: hapus link mati, ganti dengan email kontak + GitHub organisasi nyata.

### 3.4 Kualitas Output PDF (dari mata recruiter) `[KRITIS — konsensus 2 HR]`

| Temuan | Bukti |
|---|---|
| **Semua PDF kandidat bernama sama** `"LolosCV - Buat CV yang Lolos Seleksi ATS (Gratis).pdf"` — `document.title` tidak pernah diubah sebelum `window.print()`; di ATS recruiter 20 file identik = saling menimpa & terlihat massal | `resume-builder.tsx:836`; `layout.tsx:90` |
| **Bug dark mode: CV bisa tercetak teks putih di kertas putih** — template Creative/Modern memakai warna tema yang di dark mode ≈ putih; print CSS hanya memaksa background putih, tidak warna teks | `layout.tsx:133`, `resume-builder.tsx:1655, 1841`, `globals.css:143-174` |
| **`compactOnePage` default ON + floor zoom 0.5** → konten >2 halaman dipaksa font ~5px (≈3.8pt) "huruf semut"; zoom hanya di clone cetak, tidak terlihat di preview | `resume-builder.tsx:330, 823-835, 273` |
| "Download PDF" = modal donasi menyela + dialog print browser; bukan unduhan file; harus buka preview dulu (toast "Silakan buka preview CV terlebih dahulu") | `resume-builder.tsx:917-973, 836, 801, 2810` |
| Template Modern merender bullet sebagai satu paragraf (description dirender `<p>`, tidak di-split) | `resume-builder.tsx:1882` vs `corporate:1208-1212` |
| Template Creative **menghilangkan LinkedIn & portfolio** dari header | `resume-builder.tsx:1630-1638` |
| Tipografi di bawah standar keterbacaan: bullet `text-[10px]` (≈7.5pt), tanggal `text-[9px]`; `text-justify` berlubang di kolom sempit | `resume-builder.tsx:1210, 1202, 1186, 1275` |
| Sertifikasi digabung satu baris `"A | B | C"` tanpa issuer/tahun | `resume-builder.tsx:1370` |
| Field standar rekruter Indonesia hilang: tempat/tanggal lahir, expected salary, penempatan; validasi email/telepon nol | `types/index.ts:3-12` |
| Tidak ada nomor halaman/nama di footer tiap halaman untuk CV 2 halaman | print CSS |
| Foto: pintu masuk selfie tanpa panduan; mock memakai avatar inisial `ui-avatars.com` | `resume-builder.tsx:558-568`; `sample-mock.ts:82` |

**Saran terkonsolidasi:**
1. Sebelum print: `document.title = "${fullName} - ${headline || "CV"}"` lalu pulihkan. **Satu baris, dampak terbesar.**
2. Print CSS: paksa `color: #111 !important` pada clone cetak ATAU hapus class `dark` saat export (clone-dan-restore) + `color-scheme: light`.
3. Default `compactOnePage` OFF; kalau ON, floor zoom 0.75, tampilkan hasil di preview, dan kalau tetap >2 halaman → paksa pilihan pangkas/2 halaman.
4. Ganti label tombol jadi **"Cetak / Simpan PDF"** + instruksi 1 baris "Pilih 'Save as PDF' di dialog berikutnya"; pindahkan modal donasi ke SETELAH PDF sukses; auto-switch ke preview sebelum print.
5. Perbaiki Modern (render `<ul>` dari `bulletLines()`), tampilkan LinkedIn/portfolio di Creative, naikkan floor tipografi (body ≥11px), sertifikasi jadi item terstruktur (nama/issuer/tahun).
6. Tambah field opsional TTL & expected salary; validasi aktif (regex email + peringatan email tidak profesional + normalisasi telepon `+62`).
7. Detector placeholder mock (`PT Contoh`, `Sample Maju Bersama`, `email.com`) → **blokir export** dengan pesan "kamu masih memakai data contoh".
8. Nomor halaman + nama di footer saat konten >1 halaman; panduan foto 1 kalimat (latar polos, setengah badan, no selfie).

### 3.5 Bahasa & Copy UI `[SEDANG — konsensus semua persona]`

- Campur ID/EN di permukaan yang sama: "Simpan Konfigurasi" vs "Advanced Settings" vs "Muat Live"; hasil analisis mencampur "Key Requirements" dengan "Persyaratan Pendidikan" (`job-analyzer.tsx`); builder "Quick Start", "Section Order" bersisipan dengan tombol Indonesia.
- `resumeLang` default `"en"` (`resume-builder.tsx:323`) + generate/translate memaksa `"en"` (`:533, 543`) — CV untuk lamaran Indonesia jadi bahasa Inggris; toggle ke ID untuk CV terisi tanpa API → "Gagal menerjemahkan: API not configured." (`:570-589`, `api.ts:1346`).
- Error API mentah bahasa Inggris ditampilkan ke user (`"API not configured."`).
- Placeholder semua dunia IT: "cth: Machine Learning Engineer", "JavaScript, TypeScript, Python", riset "Deteksi Ujaran Kebencian di Tweet Indonesia" — user non-IT tidak melihat dirinya.
- Field tidak menandai opsional (LinkedIn/Portfolio tampil sama pentingnya dengan nama/email).
- `fixJsonString`/error campur ID+EN dalam satu kalimat (`api.ts:927`).

**Saran:** default bahasa `"id"` (deteksi `navigator.language`); audit satu-bahasa-per-permukaan ("Muat Live" → "Ambil Daftar Model", "Advanced Settings" → "Pengaturan Lanjutan", dst.); semua error API dipetakan ke pesan Indonesia actionable; placeholder netral pasar lokal (cth: "Admin Gudang", "Microsoft Excel, SAP"); tandai "(opsional)".

### 3.6 Mobile Experience `[SEDANG-KRITIS — konsensus 3 awam]`

- CTA hero bisa mati senyap di jaringan lambat: 6 `dynamic()` tanpa `loading:` UI (`page.tsx:8-13`), scrollTo hanya `getElementById` (`hero.tsx:8-11`) → klik tidak melakukan apa-apa saat chunk belum termuat.
- Maraton scroll: 11 SectionCard terbuka semua dalam satu kolom (`defaultOpen = true`); tombol Download PDF di kolom kanan yang di HP jatuh di BAWAH seluruh form; kartu "Urutan Section" (fitur power-user) menambah kebisingan.
- Toolbar sticky melipat 2-3 baris + navbar = ~180-200px layar dimakan permanen.
- Preview CV menyusut ~50% di layar 390px → teks efektif ±5px, harus pinch-zoom terus.
- Textarea kecil (`min-h-[80px] resize-none`) + keyboard menutup separuh layar; tidak auto-grow.
- Tap target <44px: checkbox "Saat ini", swatch warna `w-5 h-5`, ikon mata API key, tombol panah section order `p-1.5`.
- Grid model API `max-h-96 overflow-y-auto` = nested scroll trap di HP.
- Beban: initial JS ±203KB gzip + autosave stringify per keystroke tanpa debounce.

**Saran:** builder mobile jadi wizard bertahap (stepper + progress) atau minimal tutup SectionCard default di layar kecil + indikator "X/9 section terisi" + preset "Sederhanakan untuk fresh graduate"; tombol "Download PDF" sticky di bawah; loading skeleton untuk semua dynamic import + scrollTo dengan retry/rAF; textarea auto-grow + expand fullscreen; tap target ≥44px; preview mode "lihat per halaman" yang terbaca tanpa zoom.

### 3.7 Keamanan & Infrastruktur `[HIGH — security engineer]`

| Temuan | Severity | Bukti |
|---|---|---|
| **Auth bypass webhook Saweria**: bila `SIGNING_SECRET` diset (tanpa `SAWERIA_QUERY_SECRET`) dan request datang tanpa signature tapi dengan `?secret=<APA-ANYAR>`, pengecekan hanya memverifikasi *keberadaan* → injeksi donasi palsu `status: "verified"` ke leaderboard publik | HIGH | `saweria-webhook/route.ts:96-102, 121-131` |
| **`/api/proxy` = open relay tanpa autentikasi nyata** ke URL publik apa pun dengan header/body bebas (`isSameOrigin` hanya cek header Origin yang bisa dipalsukan curl) → relay anonim, risiko AUP Vercel | HIGH | `proxy/route.ts:126-135, 156-170` |
| **Rate limit in-memory per-instance + `clientIp` dari XFF leftmost** → trivially bypassable; di Vercel efektifnya 60×N instance | HIGH | `rate-limit.ts:5-8, 12-16` |
| **Panggilan LLM blocking 180s tanpa `export const maxDuration`** → function dipenggal timeout Vercel (Hobby 10s), klien terima 500, retry 2x membuat browser gantung hingga 3 menit + biaya 3x invocation; semua call blocking, bukan streaming | HIGH | `api.ts:217, 318-337`; `proxy/route.ts:90`; grep `maxDuration` = kosong; tidak ada `vercel.json` |
| `allowLoopback: true` aktif di production proxy → SSRF ke loopback di self-hosted Docker | MEDIUM | `proxy/route.ts:161` |
| `fetch-url` tanpa cap ukuran respons (`response.text()` mentah) → OOM/DoS; worst case chain 100s > client timeout 75s > platform timeout → strategi 2-4 (Jina/proxy/meta) praktis dead code di Vercel | MEDIUM | `fetch-url/route.ts:388-391, 383, 146-149, 322` |
| Tidak ada CSP; admin token via query param non-constant-time; sanitasi API key error hanya prefix tertentu (Mistral/Together/Cohere lolos) | MEDIUM-LOW | `next.config.js:4-18`; `donations-store.ts:32-38`; `proxy/route.ts:178-181` |
| Race read-modify-write donasi KV; kegagalan `saveDonations` ditelan + webhook tetap balas `ok` → donasi asli bisa hilang tanpa jejak | MEDIUM | `donations-store.ts:66-83` |
| Tidak ada test (0 file test), tidak ada CI (tidak ada `.github/workflows`), tidak ada error monitoring (grep Sentry dsb = kosong) | HIGH (proses) | `package.json:6-12` |

**Prioritas minggu ini:** fix webhook fail-closed (15 mnt) → `maxDuration` + timeout selaras (1 jam) → hapus `allowLoopback` production (10 mnt) → cap 10MB di fetch-url (30 mnt) → robots disallow `/api` (10 mnt).
**Bulan ini:** CI + unit test pertama (`ssrf.ts`, `normalizeResumeData`) → rate limit ke Upstash/KV + IP platform → allowlist domain provider di proxy + filter header → Sentry → paralelkan strategi fetch-url (budget 20-25s, `Promise.any`).

### 3.8 Arsitektur Kode Frontend `[SEDANG — frontend engineer]`

- **God component:** `resume-builder.tsx` 2900 baris (30+ useState, 4 template inline, 9 form section, 3 modal, toast, toolbar, sidebar); `api.ts` 1677 baris (6 tanggung jawab campur: transport, provider detection, JSON repair, migrasi data, 10+ prompt bisnis, skor ATS).
- **Duplikasi masif:** 4 template × 9 section ~70-80% markup copy-paste (~900 baris) — bukti inkonsistensi: `exp.description.split("\n")` di corporate vs `bulletLines()` di creative.
- **Coupling via `window.CustomEvent` tanpa tipe:** 3 nama event inline, listener builder menangani 2 bentuk detail sekaligus; event yang dikirim sebelum chunk builder termuat = hilang tanpa jejak; `sample-generation.ts` punya mini-store ganda (listeners Set + window event).
- **Nol memoization di seluruh codebase** (grep `useMemo|React.memo` = 0); re-render total per keystroke; `getDisplaySkillGroups` dipanggil 2-6x per render tanpa memo; forced reflow pengukur tinggi per ketikan saat preview terbuka.
- **A11y:** puluhan field tanpa `htmlFor`; modal tanpa `role="dialog"`, focus trap, dan Escape; toast tanpa `aria-live` dan timer tidak di-clear (toast kedua tertutup prematur).
- **Magic strings** localStorage tersebar 6 file + dead code (`FONT_LABELS`, `SIZE_LABELS`, `SECTION_LABELS`, key `resume_data_before_optimize`).
- **TS bocor:** 17 `any` di builder, 56 di api.ts; 3 generasi format data hidup bersama (`skills`+`skillGroups`, `certifications`+`achievements`+`awards`) tanpa `schemaVersion`.
- i18n ad-hoc ternary ID/EN di ~100 titik; AI generate loop serial per-item tanpa progress.

**Roadmap refactor target:**
```
src/
  store/resume-store.ts          # zustand + persist (debounced, partialize) — konfirmasi+backup dipaksa di action replace()
  store/ui-store.ts              # toast global (aria-live)
  features/resume-builder/
    ResumeBuilder.tsx            # orchestrator <150 baris
    sections/*.tsx               # 1 komponen per section form
    preview/{4 template}.tsx
    preview/sections/*.tsx       # 1 section-preview × 4 varian style (dedup ~600-700 baris)
    modals/*.tsx
  lib/ai/{transport,prompts/*,job-ai,resume-ai,ats-ai}.ts
  lib/storage.ts                 # LS_KEYS registry + typed safeLocal*
  lib/events.ts                  # konstanta nama event (hilang saat zustand masuk)
```

---

## 4. Roadmap Implementasi

### Fase 0 — Minggu ini: Stop-the-bleeding (semua ≤ 1 hari total)

- [ ] **S1** Fix auth bypass webhook Saweria — fail-closed total saat `SIGNING_SECRET` diset (`saweria-webhook/route.ts:96-102`) — *15 mnt*
- [ ] **Data-loss** Jalur job-analyzer & ats-optimizer: cek `isResumeEmpty` → dialog konfirmasi + tulis backup `resume_data_before_generate` yang sama + tombol undo (`job-analyzer.tsx:134-141`, `ats-optimizer.tsx:141-151`)
- [ ] **Data-loss** `safeLocalSet` return boolean + toast peringatan saat quota penuh (`api.ts:21-25`)
- [ ] **PDF** `document.title = "${nama} - ${headline}"` sebelum print, pulihkan setelahnya (`resume-builder.tsx:836`) — *1 baris*
- [ ] **PDF** Fix print dark mode: hapus class `dark` saat export / paksa warna teks gelap di clone cetak (`globals.css:143-174`)
- [ ] **PDF** Default `compactOnePage` OFF (`resume-builder.tsx:330`)
- [ ] **Trust** Revisi klaim privasi `features.tsx:53-54` jadi akurat (transit ≠ disimpan)
- [ ] **Infra** `export const maxDuration` di semua API route + turunkan `LLM_TIMEOUT_MS`/`UPSTREAM_TIMEOUT_MS` ke bawah limit plan + jadikan platform-timeout non-retryable (`api.ts:217`, `proxy/route.ts:90, 318-337`)
- [ ] **Infra** Hapus `allowLoopback` di production (`proxy/route.ts:161` — gate `NODE_ENV`)
- [ ] **Infra** Response size cap 10MB di `fetch-url` (`fetch-url/route.ts:388-391`)
- [ ] **SEO** `robots.ts` disallow `/api`; sitemap `lastModified` stabil (`robots.ts:6`, `sitemap.ts:8`)
- [ ] **Promosi** Pasang banner kampanye MagangHub + ganti headline hero jadi "Ramah ATS" (copy siap pakai di [promosi-dan-all-in-one-2026-11.md](promosi-dan-all-in-one-2026-11.md) §4) — **HANYA setelah 3 fix PDF + revisi klaim privasi di atas selesai**, dan tanpa klaim afiliasi Kemnaker

### Fase 1 — Bulan ini: Onboarding, trust, dan mobile (dampak user terbesar)

- [ ] **Demo-first flow** (tembok API key): CTA "Coba Tanpa API Key (Gratis)" di hero + opsi di semua pesan error analyzer/import; mock sample jadi jalan utama, bukan tersembunyi
- [ ] **Panduan API key** berbahasa awam + ber-screenshot (rekomendasi Google AI Studio / Groq free tier tanpa kartu kredit) di section API
- [ ] **api-settings dua mode**: Mode Mudah (paste → 1 tombol "Sambungkan") vs Mode Lanjutan; sembunyikan Reasoning Effort/Base URL/XMax/Muat Live dari mode mudah; otomatiskan Tes Koneksi saat Simpan
- [ ] **Mock persona netral**: sample admin/fresh graduate berbahasa Indonesia; hapus paksaan `setResumeLang("en")`; default `resumeLang` `"id"` (deteksi `navigator.language`)
- [ ] **Bahasa UI**: audit satu-bahasa-per-permukaan; semua error API → pesan Indonesia actionable ("API not configured." → arahan + tombol ke section API); jelaskan ATS di hero
- [ ] **Placeholder & mock guard**: detector placeholder ("PT Contoh" dll.) → blokir export; demo ATS pakai keyword dari lowongan tersimpan atau disclaimer besar; badge "WAJIB" hanya untuk critical beneran
- [ ] **Export PDF UX**: label "Cetak / Simpan PDF" + instruksi "pilih Save as PDF"; auto-switch ke preview; pindahkan modal donasi ke setelah sukses + opsi jangan tanya lagi; sticky Download button di mobile
- [ ] **Persistensi**: export/import JSON + chip "Tersimpan otomatis di browser ini" + "Hapus semua data saya"; debounce autosave; kompres foto ≤300KB; restorasi kartu hasil analisis saat mount
- [ ] **Trust/legal**: halaman `/privacy` + `/terms` + email kontak di footer; hapus sosial link mati; sebutkan relay pihak ketiga (Jina/corsproxy) di kebijakan
- [ ] **Mobile**: builder wizard/stepper atau collapse SectionCard default di mobile + progress "X/9 terisi" + preset "Sederhana fresh graduate"; textarea auto-grow + expand fullscreen; tap target ≥44px; loading skeleton untuk semua `dynamic()` + scrollTo yang menunggu elemen
- [ ] **Keamanan**: allowlist domain provider di `/api/proxy` + filter header yang diteruskan; rate limit ke Upstash/KV + IP dari platform (bukan XFF leftmost); Sentry (free tier); jangan balas `ok` saat `saveDonations` gagal
- [ ] **CI**: GitHub Actions (typecheck + lint + build) + unit test pertama untuk `ssrf.ts`, `normalizeResumeData`, `preserveOriginalFacts`
- [ ] **Wire "Gunakan Template"** agar benar-benar menset template builder (`templates.tsx:111-117`)
- [ ] **Fitur baru** Surat lamaran generator v1 (teks → PDF; reuse `job_analysis` + `resume_data` + infra BYOK + fallback tanpa AI — lampiran wajib lamaran di Indonesia, tidak ada padanan gratis di pasar ID; gap #1 dari riset kompetitor)

### Fase 2 — Kuartal ini: Struktur & kualitas output

- [ ] **Refactor store**: zustand menggantikan CustomEvent; konfirmasi+backup dipaksa di action `replace()`; split resume-builder per-section + dedup 4 template (target: orchestrator <150 baris, -600-700 baris duplikat)
- [ ] **Split api.ts** menjadi transport / providers / prompts / domain (json-repair scanner jadi jalur utama)
- [ ] **Zod schema** `ResumeData` + `schemaVersion` + pipeline migrasi bernomor (ganti `normalizeResumeData` manual)
- [ ] **Import PDF tanpa API**: ekstraksi lokal regex/heuristik (nama/email/telepon/pendidikan) sebagai fallback gratis + layar review field penuh + rekonstruksi baris berdasar posisi Y untuk PDF 2 kolom
- [ ] **Kualitas CV output** (per Bu Dewi): Modern render `<ul>`; Creative tampilkan LinkedIn/portfolio; tipografi body ≥11px; sertifikasi terstruktur; field TTL + expected salary; validasi email/telepon; nomor halaman; panduan foto
- [ ] **A11y menyeluruh**: `htmlFor` semua field, `aria-live` toast, modal focus trap + Escape, error boundary per section, `testConnection` mengembalikan pesan error asli
- [ ] **Streaming SSE** di proxy agar LLM call tidak blocking & UX real-time
- [ ] **i18n minimal**: `dict.ts` { id, en } + hook `useT()` (ganti ~100 ternary)
- [ ] **Foto ke IndexedDB** (IDBKeyval) — hapus beban MB dari localStorage
- [ ] **SEO konten**: halaman `/fitur` & `/faq` untuk long-tail keyword; `twitter:image` eksplisit
- [ ] **CSP** (Report-Only → enforce) dengan hash untuk inline script + JSON-LD
- [ ] **Test suite**: Vitest (json-repair, migrasi, store destruktif — snapshot "resume tidak boleh hilang tanpa konfirmasi") + Playwright smoke (analyze→generate→export)
- [ ] **Fitur baru (gap kompetitor, all-in-one)** cover letter builder visual tersinkron CV, multi-slot CV, job tracker lokal, import LinkedIn via export PDF profil, PWA installable, template segmen lokal (setelah dedup template), halaman SEO per-fitur & contoh — urutan, effort, dan yang TIDAK perlu ditiru lihat [promosi-dan-all-in-one-2026-11.md](promosi-dan-all-in-one-2026-11.md) §5-6
- [ ] **Opsional**: sync backend ringan (device code → KV) atau pairing QR untuk pindah perangkat

### Fase 3 — Ideal state (bila produktu tumbuh)

- Akun opsional / sync cloud dengan enkripsi, multi-device resume
- Native PDF generation (jsPDF/canvas) sebagai alternatif dialog print — file .pdf langsung
- Dashboard provider-side analytics opt-in (bukan pelacakan user) untuk tahu funnel drop-off
- Template marketplace / preset industri (admin, logistics, creative, IT) dengan placeholder per-industri

---

## 5. Goals & KPI

| Goal | KPI | Target |
|---|---|---|
| User tanpa API key bisa menyelesaikan CV end-to-end | % user demo yang sampai tombol unduh; waktu penuh | ≥60% selesai, <10 menit |
| Tidak ada jalur data-loss | Audit: 100% aksi destruktif punya konfirmasi + backup + undo; autosave gagal selalu terlihat | 0 jalur tanpa pagar |
| Zero silent failure | Error monitoring aktif; semua `catch` menampilkan sesuatu | 0 `catch {}` pada jalur user |
| CV output layak recruiter | Nama file = nama kandidat; terbaca di dark mode; body ≥10.5pt; 0 data placeholder terkirim | 4/4 terpenuhi |
| Kejujuran klaim | Copy privasi akurat + halaman legal live + disclaimer skor | `/privacy`, `/terms` live; skor direbrand |
| Waktu menuju CV (mobile) | Time-to-first-CV di HP | <15 menit |
| Keamanan | Re-audit temuan HIGH | 0 HIGH setelah Fase 0+1 |
| Proses rekayasa | CI hijau; test modul kritis | CI wajib per PR; coverage `ssrf.ts`, migrasi, store |
| Kepercayaan (proxy ukuran Pak Agus) | Skor "mau kandidat saya pakai ini" | 4 → ≥7 setelah Fase 1 |

---

## 6. Rekomendasi Tim Implementasi (role sub-agents untuk eksekusi)

Eksekusi roadmap di atas paling efisien dengan 5 role yang bekerja paralel per fase:

1. **UX-Copy Agent** — audit & tulis ulang semua copy UI (bahasa awam, satu bahasa per permukaan, panduan API key, halaman legal). Fase 1.
2. **Builder-Refactor Agent** — zustand store, split sections/templates, jalur destruktif terpagar, debounce autosave, IndexedDB foto. Fase 1-2.
3. **PDF-Export Agent** — document.title, dark-mode print fix, kompaksi, tipografi, template fixes (Modern `<ul>`, Creative LinkedIn), sertifikasi terstruktur. Fase 0-1.
4. **Security-Infra Agent** — webhook fail-closed, proxy allowlist, rate limit KV, maxDuration/streaming, CSP, Sentry, CI, robots/sitemap. Fase 0-1.
5. **QA-Persona Agent** — replay skenario 3 persona awam + 2 recruiter sebagai acceptance test setelah tiap fase (Playwright smoke + checklist manual).

---

## 7. Kredit — Yang Sudah Bagus (dipertahankan)

1. **Autosave + backup + undo di dalam builder** bekerja nyata (`resume-builder.tsx:384-453, 356-382`) — jarang ada di tool sejenis; tinggal diratakan ke semua jalur + diberi tahu ke user.
2. **Anti-fabrikasi yang di-engineer, bukan prompt doang** — `preserveOriginalFacts` (`api.ts:1401-1510`) mengunci fakta kandidat; ini yang membuat Pak Agus memberi 7/10.
3. **SSRF defense-in-depth** — DNS-resolve + validasi per-hop redirect (`ssrf.ts:110-165`).
4. **Pesan error crawler terbaik di produk**: "buka lowongannya di browser, copy deskripsinya, lalu gunakan tab 'Paste Teks'" (`api.ts:956-963`) — pola ini layak jadi standar semua error.
5. **Gratis jujur tanpa signup** — Rp 0 selamanya, donasi opsional bisa dilewati; pembeda nyata vs Canva/Zety.
6. **Budaya bullet terukur** — prompt melarang "responsible for / helped with" dan mewajibkan angka (`api.ts:1591`); mock mencontohkan dengan benar.
7. **Local-first + zero analytics** — tidak ada pelacakan tersembunyi; arah privasi yang benar.
8. **pdfjs benar-benar lazy** + worker versi-sinkron + guard 10MB/10 halaman (`cv-uploader.tsx:27-51`).
9. **Kejujuran labeling mode demo** ("Mode Demo", "Hasil simulasi") — masalahnya adalah user yang tidak membaca, bukan label disembunyikan.
10. **Konfigurasi BYOK paling teliti** — deteksi provider prefix + effort hanya ke model yang mendukung + save terkunci sampai tes sukses.

---

*Disusun 4 November 2026 · 7 persona · bukti mengacu ke commit terkini di `main`.*
