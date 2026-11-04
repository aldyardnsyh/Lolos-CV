// Helper file untuk resume-builder:
// 1. Kompresi foto (canvas) agar foto base64 tidak menggedor kuota localStorage.
// 2. Export / import seluruh data CV sebagai file JSON.
// 3. Hapus semua key localStorage milik LolosCV (untuk tombol "Hapus semua data saya").

export interface ResumeFileV2 {
  schemaVersion: 2
  exportedAt: string
  resume_data: unknown
  resume_lang: "id" | "en"
  resume_style: unknown
  resume_layout: unknown
  sectionOrder: unknown
  hiddenSections: unknown
}

// ---------------------------------------------------------------------------
// Kompresi foto
// ---------------------------------------------------------------------------

const PHOTO_MAX_DIMENSIONS = [800, 640, 512, 400]
const PHOTO_QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Gagal membaca file foto."))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("File bukan gambar yang valid."))
    img.src = src
  })
}

function fitDimensions(w: number, h: number, maxDim: number): { width: number; height: number } {
  const longest = Math.max(w, h)
  if (longest <= maxDim) return { width: w, height: h }
  const ratio = maxDim / longest
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) }
}

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",")
  if (comma === -1) return dataUrl.length
  return Math.round(((dataUrl.length - comma - 1) * 3) / 4)
}

/**
 * Kompres foto via canvas: sisi terpanjang maksimal `maxDim` px, output JPEG
 * (PNG transparan diberi latar putih). Kualitas diturunkan bertahap sampai
 * hasil <= maxBytes (default 300KB). Lempar Error berbahasa Indonesia bila
 * tetap gagal mencapai target.
 */
export async function compressImageFile(file: File, maxBytes = 300 * 1024): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("Foto hanya bisa diproses di browser.")
  }
  let img: HTMLImageElement
  try {
    const src = await readAsDataURL(file)
    img = await loadImage(src)
  } catch (err) {
    throw err instanceof Error ? err : new Error("Gagal membaca file foto.")
  }

  for (const maxDim of PHOTO_MAX_DIMENSIONS) {
    const { width, height } = fitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim)
    let canvas: HTMLCanvasElement | null = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      canvas = null
      throw new Error("Gagal memproses foto di browser ini.")
    }
    // JPEG tidak mendukung transparansi → beri latar putih agar PNG
    // transparan tetap terlihat benar setelah dikonversi.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    let best: string | null = null
    for (const q of PHOTO_QUALITIES) {
      let out = ""
      try {
        out = canvas.toDataURL("image/jpeg", q)
      } catch {
        break
      }
      best = out
      if (dataUrlBytes(out) <= maxBytes) {
        canvas = null
        return out
      }
    }
    canvas = null
    if (best && dataUrlBytes(best) <= maxBytes) return best
  }
  throw new Error("Foto terlalu besar, coba foto lain")
}

// ---------------------------------------------------------------------------
// Export / import JSON
// ---------------------------------------------------------------------------

export interface ResumeExportInput {
  resume: unknown
  lang: "id" | "en"
  style: unknown
  layout: unknown
  sectionOrder: unknown
  hiddenSections: unknown
}

export function buildResumeFile(input: ResumeExportInput): ResumeFileV2 {
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    resume_data: input.resume,
    resume_lang: input.lang,
    resume_style: input.style,
    resume_layout: input.layout,
    sectionOrder: input.sectionOrder,
    hiddenSections: input.hiddenSections,
  }
}

function sanitizeFileNamePart(raw: string): string {
  const s = String(raw ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  return s ? s.slice(0, 60) : "cv"
}

/** Unduh data CV sebagai `loloscv-data-{nama}.json`. */
export function downloadResumeFile(payload: ResumeFileV2, fullName: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `loloscv-data-${sanitizeFileNamePart(fullName)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Parse isi file .json hasil export. Validasi minimal: harus ada objek resume
 * dengan personalInfo. Lempar Error berbahasa Indonesia bila bukan file kita.
 */
export function parseResumeFile(text: string): ResumeFileV2 {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("File tidak dikenali. Pilih file .json yang dibuat dari tombol 'Simpan data ke file'.")
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("File tidak dikenali sebagai data CV LolosCV. Gunakan file .json hasil tombol 'Simpan data ke file'.")
  }
  const obj = parsed as Record<string, unknown>
  const resumeRaw = obj.resume_data ?? (obj as { resume?: unknown }).resume
  const resume = resumeRaw && typeof resumeRaw === "object" && !Array.isArray(resumeRaw)
    ? (resumeRaw as Record<string, unknown>)
    : null
  const pi = resume?.personalInfo
  const piObj = pi && typeof pi === "object" && !Array.isArray(pi)
    ? (pi as Record<string, unknown>)
    : null
  if (!resume || !piObj) {
    throw new Error("File tidak dikenali sebagai data CV LolosCV. Gunakan file .json hasil tombol 'Simpan data ke file'.")
  }
  const hasIdentity = Boolean(piObj.fullName || piObj.email || piObj.phone)
  const hasContent = (Array.isArray(resume.experiences) && resume.experiences.length > 0)
    || (Array.isArray(resume.education) && resume.education.length > 0)
    || (typeof resume.summary === "string" && resume.summary.trim().length > 0)
  if (!hasIdentity && !hasContent) {
    throw new Error("File tidak dikenali: tidak ada data CV di dalamnya. Gunakan file .json hasil tombol 'Simpan data ke file'.")
  }
  return {
    schemaVersion: 2,
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : "",
    resume_data: resumeRaw,
    resume_lang: obj.resume_lang === "en" ? "en" : "id",
    resume_style: obj.resume_style,
    resume_layout: obj.resume_layout,
    sectionOrder: obj.sectionOrder,
    hiddenSections: obj.hiddenSections,
  }
}

// ---------------------------------------------------------------------------
// Hapus semua data milik LolosCV di localStorage
// ---------------------------------------------------------------------------

// Key milik app saja. Key asing (extension, situs lain) tidak disentuh.
export const APP_STORAGE_KEYS = [
  "api_config",
  "resume_data",
  "resume_data_before_generate",
  "resume_lang",
  "resume_style",
  "resume_layout",
  "job_analysis",
  "maganghub_banner_dismissed",
  "donation_modal_dismissed",
  "resume_sections_open",
  "theme",
] as const

export function clearAppStorage(): void {
  if (typeof window === "undefined") return
  for (const key of APP_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key)
    } catch {}
  }
}
