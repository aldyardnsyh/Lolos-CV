// Pesan dukungan yang tampil setelah user menyimpan CV.
//
// Prinsipnya: pesan ini bukan iklan donasi. Isinya doa dan harapan untuk
// user, memakai nama yang dia isi sendiri di kolom CV. Ajakan donasi datang
// paling akhir, singkat, dan jelas opsional.
//
// Rotasi: setiap kali modal muncul, pesan yang dipakai tidak boleh sama
// dengan pesan sebelumnya. Urutan acak disimpan di localStorage supaya
// 10 pesan terpakai habis dulu sebelum ada yang berulang.

const ROTATION_KEY = "donation_message_rotation"
const LAST_KEY = "donation_message_last"

export type SupportMessage = {
  id: string
  /** Judul singkat, dipakai di atas paragraf. */
  title: string
  /** Paragraf utama. {nama} diganti nama dari kolom CV. */
  body: string
}

export const SUPPORT_MESSAGES: SupportMessage[] = [
  {
    id: "pekerjaan-terbaik",
    title: "Semoga lekas sampai",
    body: "Semoga {nama} segera mendapat pekerjaan yang terbaik: lingkungan yang sehat, atasan yang menghargai, dan jenjang karier yang jelas. Dimudahkan di setiap tahap, dari penyaringan berkas, wawancara, sampai hari pertama masuk kerja.",
  },
  {
    id: "usaha-tidak-siapa",
    title: "Usahamu tidak sia-sia",
    body: "Menyusun CV sampai rapi seperti ini bukan hal kecil, {nama}. Semoga semua waktu dan tenaga yang kamu keluarkan berbuah manis, dan lamaran yang kamu kirim dibaca oleh orang yang tepat.",
  },
  {
    id: "rejeki-tidak-kemana",
    title: "Rezeki tidak pernah tertukar",
    body: "{nama}, semoga rezeki yang jadi bagianmu tidak pernah tertukar. Kalau hari ini belum ada kabar, semoga besok membawa kabar yang lebih baik. Tetap tenang, tetap melamar, tetap percaya.",
  },
  {
    id: "keberanian-melamar",
    title: "Terima kasih sudah berani",
    body: "Melamar kerja itu butuh keberanian, {nama}. Setiap lamaran yang kamu kirim adalah satu langkah yang tidak semua orang mau ambil. Semoga langkah-langkah kecil ini membawa {nama} ke tempat yang selama ini diinginkan.",
  },
  {
    id: "wawancara-lancar",
    title: "Semoga lancar di wawancara",
    body: "Kalau nanti {nama} dipanggil wawancara, semoga bicaranya lancar, pikirannya tenang, dan pewawancaranya melihat potensi yang selama ini kamu bangun. Semoga rasa gugupnya berubah jadi keyakinan.",
  },
  {
    id: "diterima-di-tempat-baik",
    title: "Semoga diterima di tempat yang baik",
    body: "{nama}, semoga lamaran ini membawa {nama} ke perusahaan yang bukan cuma membayar, tapi juga menghargai. Tempat di mana kamu bisa bertumbuh tanpa harus kehilangan ketenangan.",
  },
  {
    id: "proses-tidak-mudah",
    title: "Prosesnya memang tidak mudah",
    body: "Mencari kerja sering terasa melelahkan dan sunyi, {nama}. Semoga kamu dikelilingi orang-orang yang menyemangati, dan semoga lelahmu hari ini tercatat sebagai jalan menuju hal yang lebih baik.",
  },
  {
    id: "keluarga-bangga",
    title: "Semoga jadi kabar baik",
    body: "Semoga CV yang baru {nama} susun ini jadi awal dari kabar baik yang ditunggu keluarga. Semoga {nama} bisa bercerita dengan bangga bahwa usaha yang dijalani selama ini akhirnya membuahkan hasil.",
  },
  {
    id: "kemampuan-dihargai",
    title: "Semoga kemampuanmu dihargai",
    body: "Semua yang {nama} tulis di CV ini adalah hasil kerja nyata, bukan karangan. Semoga perusahaan yang tepat melihatnya, dan semoga {nama} tidak perlu menurunkan standar hanya demi diterima.",
  },
  {
    id: "langkah-berikutnya",
    title: "Satu langkah lagi",
    body: "{nama}, kamu sudah menyelesaikan satu hal yang sering ditunda orang lain. Semoga langkah berikutnya lebih ringan, dan semoga pintu yang selama ini tertutup mulai terbuka satu per satu.",
  },
]

/** Ambil nama panggilan dari nama lengkap: kata pertama, dirapikan kapitalisasinya. */
export function firstNameOf(fullName: string): string {
  const first = String(fullName || "").trim().split(/\s+/)[0] || ""
  if (!first) return ""
  // Jangan sentuh singkatan berkapital penuh (mis. "AJ") atau nama yang sudah kapital.
  if (first.length <= 2 || first === first.toUpperCase()) return first
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/**
 * Pilih pesan berikutnya: tidak pernah sama dengan pesan terakhir, dan
 * menghabiskan seluruh daftar dulu sebelum ada pengulangan.
 */
export function nextSupportMessage(): SupportMessage {
  const ids = SUPPORT_MESSAGES.map((m) => m.id)
  let queue: string[] = []
  let last = ""
  try {
    const rawQueue = localStorage.getItem(ROTATION_KEY)
    const parsed = rawQueue ? JSON.parse(rawQueue) : null
    if (Array.isArray(parsed)) queue = parsed.filter((x) => typeof x === "string" && ids.includes(x))
    last = localStorage.getItem(LAST_KEY) || ""
  } catch {}

  // Buang sisa yang tidak valid atau yang sama dengan pesan terakhir.
  queue = queue.filter((id) => id !== last)

  if (queue.length === 0) {
    queue = shuffle(ids.filter((id) => id !== last))
  }

  const picked = queue.shift() as string
  try {
    localStorage.setItem(ROTATION_KEY, JSON.stringify(queue))
    localStorage.setItem(LAST_KEY, picked)
  } catch {}

  return SUPPORT_MESSAGES.find((m) => m.id === picked) ?? SUPPORT_MESSAGES[0]
}

/** Isi paragraf dengan nama panggilan; kalau nama kosong, pakai sapaan netral. */
export function fillSupportMessage(message: SupportMessage, fullName: string): string {
  const name = firstNameOf(fullName)
  if (name) return message.body.replaceAll("{nama}", name)
  // Tanpa nama: hilangkan placeholder dan rapikan spasi/koma yang menggantung.
  return message.body
    .replaceAll("{nama}, ", "")
    .replaceAll("{nama} ", "")
    .replaceAll("{nama}", "")
    .replace(/\s{2,}/g, " ")
    .trim()
}
