# Rencana SEO & Share Card — LolosCV (November 2026)

> Dokumen pelengkap [audit-multipearsona-2026-11.md](audit-multipearsona-2026-11.md) dan [promosi-dan-all-in-one-2026-11.md](promosi-dan-all-in-one-2026-11.md).
> Tujuan: menang pencarian "contoh cv ats", "cv ats friendly", "template cv ats" + keyword general lainnya, memperbaiki kartu preview Google & share card sosmed.
> Semua "kondisi saat ini" di bawah **sudah diverifikasi langsung** ke live site + kode (4 Nov 2026), bukan asumsi.

---

## 1. Kondisi Aktual (terverifikasi)

### ✅ Yang SUDAH benar — jangan dirombak, ini fondasinya

| Elemen | Status terverifikasi |
|---|---|
| Google Search Console verification | ✓ meta `google-site-verification` live di head |
| Canonical URL | ✓ `<link rel="canonical" href="https://www.loloscvats.web.id">` |
| Open Graph image | ✓ `/opengraph-image` merender **200 OK, image/png, 1200×630** (next/og edge, statis, tanpa font eksternal) |
| Twitter card | ✓ `summary_large_image` + `twitter:image` terisi otomatis |
| robots.txt + sitemap.xml | ✓ live, sitemap ter-deklarasikan |
| JSON-LD | ✓ 3 blok: SoftwareApplication + FAQPage (5 Q&A) + Organization |
| og:site_name | ✓ "LolosCV" — inilah sumber **nama situs di kartu Google** |
| Bahasa | ✓ `lang="id"` |
| Title + description | ✓ mengandung kata kunci inti |

**Kesimpulan penting dari tabel ini:** share card sosmed di halaman depan **sudah bekerja** (og:image merender normal). Kalau saat share di WhatsApp/sosmed masih tampil link mentah, itu hampir pasti **cache lama di platform tujuan** (WhatsApp/Twitter cache agresif) atau share dilakukan sebelum OG di-deploy — bukan karena tag-nya hilang. Cek ulang share link ke WhatsApp sekarang; kalau masih mentah, buka [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) dan klik "Scrape Again" untuk refresh cache.

### ❌ Yang bermasalah / belum ada (ditemukan hari ini)

1. **Favicon tidak persegi: `961×965`** (`src/app/icon.jpg`, apple-icon juga). Google hanya menampilkan favicon di kartu SERP jika persegi & berukuran kelipatan 48px. Ini penyebab paling mungkin kalau kotak kecil (favicon + nama situs) belum muncul di hasil pencarian. **Fix paling murah, dampak langsung ke tampilan SERP.**
2. **robots.txt mengizinkan `/api/*` terindeks** (`robots.ts:6` — `allow: "/"` tanpa disallow). Endpoint proxy/fetch-url tidak boleh muncul di Google.
3. **Sitemap hanya 1 URL** dengan `lastModified: new Date()` — nilai berubah tiap build (2026-09-30 saat ini) sehingga sinyal lastmod tidak bermakna; dan tidak ada satu pun halaman konten untuk disubmit.
4. **Structured data kurang 2 blok:** tidak ada `WebSite` (penguat nama situs di kartu Google; og:site_name sudah ada tapi best practice Google adalah WebSite schema) dan `Organization` tidak punya `logo`.
5. **Tidak ada halaman konten sama sekali** — inilah sebab utama kalah di keyword "contoh cv ats / template cv ats / cv ats friendly": orang yang mengetik itu **mau melihat contoh & template**, bukan tool. Saingan (Zety, Canva, JobStreet, Karir.com, Cake) menang keyword ini lewat halaman konten. Satu landing page tidak bisa bersaing untuk query informasional — bukan karena domain, tapi karena tidak ada kontennya.
6. **Title overselling:** "Buat CV yang Lolos Seleksi ATS" — janji yang tidak bisa dipenuhi tool manapun (temuan audit 3.3.3), dan di SERP harus dipertimbangkan ulang agar menang klik tanpa janji palsu.
7. **`meta keywords` tidak dipakai Google** (diabaikan resmi sejak 2009) — ada 11 keyword di sana, jangan andalkan; pindahkan tenaga ke konten nyata.
8. **Meta `og:title`/description halaman depan masih copy lama** — perlu disinkronkan dengan rebrand copy kampanye.

---

## 2. Jawaban Jujur Soal Domain `.web.id`

1. **Google tidak mendiskriminasi TLD.** `web.id` adalah SLD resmi di bawah ccTLD `.id`, dan ccTLD `.id` **otomatis di-geotarget ke Indonesia** — itu justru keuntungan untuk kompetisi keyword lokal ("contoh cv ats" dicari orang Indonesia). Pesaing `.com` harus mengatur geotargeting manual; milikmu gratis.
2. **Yang membuat kalah bukan TLD, tapi:** umur & authority domain, backlink, kedalaman konten, dan konsistensi. Semua itu bisa dibangun — dan halaman konten (§4) adalah lever terbesarnya.
3. **Yang wajib dicek di GSC:** Settings → International Targeting (ccTLD `.id` sudah otomatis; pastikan tidak salah konfigurasi), dan pastikan sitemap.xml sudah **disubmit** di menu Sitemaps — pendaftaran GSC saja tidak membuat Google mengcrawl; submit sitemap + Request Indexing mempercepat.
4. **Tindakan opsional murah, bukan urgensi:** beli brand domain `loloscv.com` / `loloscv.id` (±Rp100-300rb/tahun) sebagai **perlindungan brand** — tapi JANGAN dipakai/redirect sekarang. Pindah domain di awal = membuang trust GSC yang baru mulai. Simpan saja, keputusan pindah (301) bisa 6-12 bulan lagi kalau authority sudah tumbuh. Juga pertimbangkan `loloscvats.com` kalau takut ditiru/pakai orang lain.
5. **Catatan brand:** nama produk "LolosCV" vs domain "loloscvats" ada ketidak-cocokan kecil untuk brand recall — tidak fatal, tapi kalau beli domain tambahan, konsistenkan promosi dengan "LolosCV — loloscvats.web.id" di semua copy agar asosiasi terbentuk.

---

## 3. Kartu Preview Google (kotak kecil: favicon + nama situs)

Kartu itu muncul dari 3 bahan — dua sudah ada, satu rusak:

| Bahan | Status | Aksi |
|---|---|---|
| `og:site_name` / WebSite schema | ✓ ada (og:site_name) | Tambah `WebSite` JSON-LD + `Organization.logo` (S0) |
| Favicon persegi yang valid | ✗ 961×965 | Buat PNG persegi (S0) |
| Judul & deskripsi berkualitas | ✓ ada | Rebrand copy (S0, sekalian dari audit) |

**Spesifikasi fix favicon (S0):**
- Ganti `src/app/icon.jpg` → `src/app/icon.png` **persegi 192×192** (Next.js App Router otomatis generate semua ukuran + tipe yang benar saat file bernama `icon.png`), dan `src/app/apple-icon.jpg` → `apple-icon.png` **180×180**.
- Logo harus terbaca di ukuran kecil (uji: zoom out logo ke 16px — kalau "L" atau monogram tidak terbaca, pakai monogram saja, bukan logo penuh).
- Hapus dua file lama `.jpg` agar tidak konflik.

---

## 4. Halaman Konten — Lever Terbesar (ini yang menang keyword)

Prinsip: **satu intent = satu halaman**, konten nyata bernilai (bukan thin content — Google menghukum halaman massal tanpa nilai). Semua halaman server-rendered statis, tanpa client JS berat, dengan meta + OG + JSON-LD sendiri, dan saling terhubung (internal link) + terhubung ke CTA builder.

| Halaman | Intent target | Konten inti | CTA |
|---|---|---|---|
| `/contoh-cv-ats` | "contoh cv ats", "contoh cv fresh graduate", "contoh cv admin" | Galeri 4-6 contoh CV per profil (admin, fresh graduate, logistics, marketing, IT) ditulis sebagai TEKS yang bisa dicopy + penjelasan kenapa strukturnya demikian; bullet terukur ala standar prompt LolosCV | "Pakai contoh ini" → builder dengan preset konten (sekaligus jadi fitur "preset industri" Fase 2) |
| `/template-cv-ats` | "template cv ats", "template cv gratis" | Showcase 4 template LolosCV (gambar render + kapan pakai yang mana: korporat/BUMN/fresh grad/kreatif) | "Gunakan template" (wire beneran, audit #7 Rina) |
| `/cv-ats-friendly` | "cv ats friendly", "apa itu ats", "cara lolos ATS" | Panduan lengkap: apa itu ATS (bahasa awam — sekalian jawaban persona Rina), checklist 10 poin, do/don't, miskonsepsi (ATS tidak memberi skor) | "Cek kecocokan CV-mu" → ATS optimizer |
| `/contoh-surat-lamaran` | "contoh surat lamaran kerja", "cara buat surat lamaran" | **Setelah fitur surat lamaran (Fase 1).** Contoh surat per profil + struktur. Keyword volume besar, kompetitor lokal kuat di sini | Generator surat lamaran |
| `/faq` | "loloscv gratis?", "loloscv apa" | Versi HTML dari FAQ JSON-LD + FAQ baru kampanye (termasuk FAQ anti-afiliasi §4.4 promosi) | ke landing |
| `/tentang` | trust/branding | Siapa PSHT, misi "murni membantu", kontak, privacy ringkas | Saweria |

**Spesifikasi teknis (pola yang sama untuk semua):**
```
src/app/(seo)/contoh-cv-ats/page.tsx   ← server component statis, konten di JSX
src/app/(seo)/contoh-cv-ats/opengraph-image.tsx  ← OG image khusus halaman (reuse generator)
src/lib/seo/pages.ts                   ← registry: {slug, title, description, lastmod} satu sumber
```
- `sitemap.ts` dibangun dari registry + landing, `lastmod` **statis/manual** dari registry (bukan `new Date()`).
- Setiap halaman: `metadata` sendiri (title template `%s | LolosCV`), canonical otomatis, `BreadcrumbList` JSON-LD, link balik ke landing + halaman saudara di footer.
- OG image per halaman: ekstrak generator `opengraph-image.tsx` jadi komponen ber-parameter (judul + subtitle + badge), tiap route memanggil dengan copy halaman itu. **Share di sosmed per halaman jadi beda dan relevan** — ini yang dimaksud "card yang memuat website ini".
- Landing page diupdate: link halaman konten masuk footer (footer memang sedang dibereskan — audit 3.3.6), plus 1 link kontekstual dari section How It Works.

**Anti thin-content:** tiap halaman minimal 600-900 kata konten bermakna + contoh nyata. Jangan generate 20 halaman sekaligus lewat AI tanpa review — mulai 3 halaman berkualitas (contoh-cv-ats, template-cv-ats, cv-ats-friendly), baru kembangkan.

---

## 5. Roadmap Eksekusi

### S0 — Hari ini / ≤1 hari kerja (sebelum kampanye MagangHub)
- [ ] Favicon persegi: `icon.png` 192×192 + `apple-icon.png` 180×180 (hapus .jpg lama)
- [ ] `robots.ts`: `allow: "/", disallow: "/api/"`
- [ ] JSON-LD: tambah `WebSite` {name: "LolosCV", alternateName: "LolosCV ATS", url} + `Organization.logo` (URL OG image)
- [ ] Rebrand title & description: `Bikin CV ATS-Friendly Gratis — Tanpa Akun, Tanpa Watermark | LolosCV` + sinkron og:title/twitter:title dengan copy kampanye
- [ ] Hapus `meta keywords` (tidak berfungsi) — opsional, kebersihan
- [ ] Registri `src/lib/seo/pages.ts` + sitemap dari registry (lastmod stabil)

### S1 — Minggu ini–2 minggu (bergandengan Fase 0/1 audit)
- [ ] Halaman `/contoh-cv-ats` + `/template-cv-ats` + `/cv-ats-friendly` (konten ditulis manusia, contoh CV nyata)
- [ ] OG image per halaman (generator ber-parameter)
- [ ] Footer: link halaman konten + link balik (sekaligus perbaikan footer dari audit)
- [ ] **GSC workflow:** submit sitemap → URL Inspection → Request Indexing untuk 3 halaman baru + homepage → pantau Performance
- [ ] **Bing Webmaster Tools:** daftar (import dari GSC, 5 menit) — tambah cakupan Bing/DuckDuckGo gratis

### S2 — Bulan ini–kuartal (bergandengan Fase 1/2)
- [ ] `/contoh-surat-lamaran` (setelah fitur surat lamaran live)
- [ ] `/faq` + `/tentang`
- [ ] Konten programmatic per-profil (contoh CV admin/fresh-graduate/logistics sebagai sub-section `/contoh-cv-ats#admin` dst — cukup anchor, jangan halaman terpisah dulu)
- [ ] Core Web Vitals: loading skeleton dynamic import (audit T12) + Poppins 6 weight → 2 (T13) — CWV adalah tiebreaker ranking
- [ ] Op-gambar A/B: kalau CTR SERP rendah, uji OG image dengan format "sebelum/sesudah"

### S3 — Kuartal+ (authority)
- [ ] Backlink organik: share komunitas kampanye MagangHub (grup WA/Telegram/kampus) — tiap share = calon backlink + branded search
- [ ] Minta 2-3 kampus/komunitas karier menautkan halaman panduan (email santai)
- [ ] Evaluasi: beli brand domain (simpan, tidak dipakai dulu) — §2.4
- [ ] Review GSC Performance bulanan: page mana yang dapat impression tapi CTR rendah → rombak title/description-nya saja

---

## 6. Keyword Map (target realistis)

| Keyword | Halaman | Perkiraan persaingan | Realita timeline |
|---|---|---|---|
| contoh cv ats / contoh cv ats friendly | `/contoh-cv-ats` | Sedang (dikuasai konten besar) | Long-tail mulai muncul bulan 1-2; head term 3-6 bulan |
| template cv ats / template cv gratis | `/template-cv-ats` | Sedang | Sama |
| cv ats friendly / apa itu ats | `/cv-ats-friendly` | Rendah-sedang | 1-3 bulan |
| contoh cv fresh graduate / admin / logistics | anchor di `/contoh-cv-ats` | Rendah-sedang | 1-2 bulan (long-tail "contoh cv admin gudang" dsb) |
| contoh surat lamaran kerja | `/contoh-surat-lamaran` | Tinggi (diuasakan JobStreet/Cake) | 3-6 bulan, butuh authority |
| cv online gratis tanpa watermark / tanpa akun | landing + FAQ | Rendah — **ini celah, klaim unik LolosCV** | 1-2 bulan |
| maganghub syarat cv / cv magang kemnaker | `/contoh-cv-ats` (tambahkan section khusus) | Rendah **sekarang** (momentum) | Minggu-minggu ini — tapi hanya klaim konteks, bukan afiliasi |

Angka volume tidak saya karang — verifikasi di Keyword Planner/Keyword Surfer sebelum memprioritaskan; urutan tabel di atas sudah urutan effort-vs-value yang masuk akal tanpa data volume.

---

## 7. KPI & Ekspektasi Waktu (jujur, tidak janji instan)

| Metrik | Baseline hari ini | Target 1 bulan | Target 3 bulan |
|---|---|---|---|
| Halaman terindeks | 1 | 4-6 | 8-10 |
| GSC impressions/hari | (cek baseline) | naik terukur di 3 query target | trend naik konsisten |
| Kartu Google (favicon+sitename) | belum (favicon rusak) | muncul untuk homepage | sitelinks untuk halaman konten |
| Share card sosmed | homepage ✓ | semua halaman konten ✓ | ✓ |
| Klik organik | (cek baseline) | first clicks di long-tail | ratusan klik/bulan realistis |

Ekspektasi yang benar (sebagaimana Anda sebut): indexing 1-2 minggu per halaman setelah Request Indexing; ranking long-tail bisa bulan 1-3; head keyword "contoh cv ats" butuh authority 3-6 bulan+. Pemantauan: GSC → Performance → filter Query (kata kunci target) & Pages; satu review kecil tiap bulan cukup — jangan cek harian.

---

## 8. Ringkasan Satu Kalimat

Fondasi teknis SEO Anda **sudah 70% benar** (OG image, canonical, JSON-LD, GSC live — diverifikasi hari ini); yang mencegah bersaing hanya tiga: **favicon persegi yang rusak** (kartu Google), **tidak ada halaman konten** (keyword "contoh/template" adalah intent konten, bukan tool), dan **satu sitemap URL** — tiganya bisa dibenahi dalam S0 (1 hari) + S1 (3 halaman, 2 minggu), dan .web.id bukan penghambat karena ccTLD .id justru di-geotarget Indonesia secara gratis.
