"use client"

import { useEffect, useRef, useState } from "react"
import {
  Mail, FileText, Printer, Sparkles, KeyRound, Loader2, CheckCircle2, AlertCircle, X, AlertTriangle, ListChecks,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { generateCoverLetter, getApiConfig, normalizeResumeData, safeLocalGet } from "@/lib/api"
import type { JobPosting, ResumeData } from "@/types"

// ---------- Helper deterministik (tanpa API) ----------

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

function formatTanggalIndonesia(d: Date): string {
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`
}

// Nama file PDF hasil print mengikuti document.title — buang karakter yang
// tidak boleh ada di nama file (pola sama dengan resume-builder).
function sanitizePdfTitle(raw: string): string {
  return raw.replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim()
}

// Pagar anti-surat-kosong: resume dianggap kosong bila tidak ada satu pun
// data nyata (nama, ringkasan, pengalaman, pendidikan, skill, dst).
function isResumeEmpty(r: ResumeData): boolean {
  return !(
    r.personalInfo.fullName.trim() ||
    r.summary.trim() ||
    r.experiences.length > 0 ||
    r.organizations.length > 0 ||
    r.education.length > 0 ||
    r.research.length > 0 ||
    r.skills.length > 0 ||
    r.skillGroups.length > 0 ||
    r.projects.length > 0 ||
    r.certifications.length > 0 ||
    r.achievements.length > 0 ||
    r.awards.length > 0
  )
}

// Susun teks konteks lowongan untuk prompt AI dari job_analysis + input user.
function buildJobContext(job: JobPosting | null, position: string, company: string): string {
  const parts: string[] = []
  if (position.trim()) parts.push(`Posisi yang dilamar: ${position.trim()}`)
  if (company.trim()) parts.push(`Perusahaan: ${company.trim()}`)
  if (job) {
    if (job.location) parts.push(`Lokasi: ${job.location}`)
    const req = [...(job.keyRequirements || []), ...(job.preferredQualifications || [])].filter(Boolean)
    if (req.length > 0) {
      parts.push(`Persyaratan lowongan:\n- ${req.slice(0, 10).join("\n- ")}`)
    } else if (job.description) {
      parts.push(`Deskripsi lowongan: ${job.description.slice(0, 1500)}`)
    }
  }
  return parts.join("\n")
}

// Turunkan huruf pertama agar kalimat bullet menyambung natural setelah koma,
// tanpa merusak singkatan/istilah berkapital penuh (CI/CD, SQL, K3, dsb).
function lowerFirstSafe(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

// Baris bullet pertama dari deskripsi pengalaman (tiap baris = 1 bullet).
function firstBulletLine(desc: string): string {
  return String(desc || "").split("\n").map((l) => l.trim().replace(/^[-*\u2022]\s*/, "")).filter(Boolean)[0] || ""
}

function stripTrailingPeriod(s: string): string {
  return s.replace(/[.\s]+$/, "")
}

// Generator kerangka surat deterministik (gratis, tanpa API). Semua isi
// diambil dari data CV apa adanya; tanpa data diisi placeholder yang jelas.
function buildManualLetter(resume: ResumeData, position: string, company: string): string {
  const pi = resume.personalInfo
  const name = pi.fullName.trim() || "[Nama Lengkap sesuai CV]"
  const city = pi.location ? pi.location.split(",")[0].trim() : ""
  const posisi = position.trim() || "[Posisi yang dilamar]"
  const perusahaan = company.trim()
  const tanggal = formatTanggalIndonesia(new Date())

  const lines: string[] = []
  lines.push(city ? `${city}, ${tanggal}` : tanggal)
  lines.push("")

  if (perusahaan) {
    lines.push("Kepada Yth.")
    lines.push(`Divisi Rekrutmen / HRD ${perusahaan}`)
    lines.push("")
  }

  lines.push(`Perihal: Lamaran Posisi ${posisi}`)
  lines.push("Lampiran: 1 berkas")
  lines.push("")
  lines.push("Dengan hormat,")

  // Paragraf pembuka: perkenalan + posisi + sumber info (umum & jujur).
  const sumber = perusahaan
    ? `Melalui ${perusahaan} yang saya ketahui memiliki kebutuhan untuk posisi ini`
    : "Melalui informasi lowongan yang saya terima"
  lines.push(
    `Melalui surat ini saya, ${name}, bermaksud mengajukan lamaran untuk posisi ${posisi}` +
    (perusahaan ? ` di ${perusahaan}` : "") +
    `. CV saya terlampir sebagai gambaran lengkap latar belakang saya. ${sumber}, saya meyakini kualifikasi yang saya miliki relevan untuk dipertimbangkan.`
  )
  lines.push("")

  // Paragraf isi 1: ringkasan dari CV, atau pendidikan/pengalaman pertama.
  let isi1 = ""
  if (resume.summary.trim()) {
    isi1 = `Secara ringkas, latar belakang saya adalah ${lowerFirstSafe(resume.summary.trim())}`
    if (!/[.!?]$/.test(isi1)) isi1 += "."
  } else if (resume.education.length > 0) {
    const e = resume.education[0]
    const jurusan = [e.degree, e.field].map((x) => x.trim()).filter(Boolean).join(" ")
    isi1 =
      `Latar belakang pendidikan saya adalah ${jurusan || "jenjang pendidikan terakhir"}` +
      (e.institution ? ` di ${e.institution}` : "") +
      (e.gpa ? ` dengan IPK ${e.gpa}` : "") +
      "."
  } else if (resume.experiences.length > 0) {
    const e = resume.experiences[0]
    isi1 =
      `Pengalaman kerja terakhir saya sebagai ${e.position || "karyawan"}` +
      (e.company ? ` di ${e.company}` : "") +
      "."
  }
  if (isi1) {
    lines.push(isi1)
    lines.push("")
  }

  // Paragraf isi 2: maksimal 3 pengalaman terkuat diubah jadi kalimat.
  const bukti: string[] = []
  for (const e of resume.experiences) {
    if (bukti.length >= 3) break
    const detail = firstBulletLine(e.description)
    bukti.push(
      stripTrailingPeriod(
        `Sebagai ${e.position || "karyawan"} di ${e.company || "tempat kerja"}` +
        (detail ? `, saya ${lowerFirstSafe(detail)}` : "")
      ) + "."
    )
  }
  for (const o of resume.organizations) {
    if (bukti.length >= 3) break
    const detail = firstBulletLine(o.description)
    bukti.push(
      stripTrailingPeriod(
        `Saya aktif sebagai ${o.position || "anggota"} di ${o.organization || "organisasi"}` +
        (detail ? `, dengan ${lowerFirstSafe(detail)}` : "")
      ) + "."
    )
  }
  for (const p of resume.projects) {
    if (bukti.length >= 3) break
    const detail = firstBulletLine(p.description)
    bukti.push(
      stripTrailingPeriod(
        `Saya mengerjakan proyek ${p.name || ""}` +
        (detail ? `, di mana ${lowerFirstSafe(detail)}` : "")
      ) + "."
    )
  }
  if (bukti.length > 0) {
    lines.push(bukti.join(" "))
    lines.push("")
  }

  // Paragraf penutup + tanda tangan.
  lines.push(
    "Berdasarkan latar belakang tersebut, saya berharap dapat diberikan kesempatan mengikuti proses seleksi atau interview untuk menjelaskan kualifikasi saya lebih lanjut."
  )
  lines.push("")
  lines.push("Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.")
  lines.push("")
  lines.push("Hormat saya,")
  lines.push("")
  lines.push("")
  lines.push(name)

  return lines.join("\n")
}

// ---------- Komponen ----------

export function CoverLetter() {
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [job, setJob] = useState<JobPosting | null>(null)
  const [position, setPosition] = useState("")
  const [company, setCompany] = useState("")
  const [letter, setLetter] = useState("")
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [needsApiHelp, setNeedsApiHelp] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500)
  }

  useEffect(() => {
    // Muat CV + hasil analisis lowongan dari localStorage (sumber sama dengan builder).
    const loadResume = () => {
      const raw = safeLocalGet("resume_data")
      if (raw) {
        try { setResume(normalizeResumeData(JSON.parse(raw))) } catch {}
      }
    }
    loadResume()
    const jobRaw = safeLocalGet("job_analysis")
    if (jobRaw) {
      try {
        const parsed = JSON.parse(jobRaw) as JobPosting
        if (parsed && typeof parsed === "object") {
          setJob(parsed)
          if (parsed.position) setPosition((prev) => prev || parsed.position)
          if (parsed.companyName) setCompany((prev) => prev || parsed.companyName)
        }
      } catch {}
    }

    const checkApi = () => setHasApiKey(!!getApiConfig())
    checkApi()

    window.addEventListener("resume_data_updated", loadResume)
    window.addEventListener("api_config_changed", checkApi)
    return () => {
      window.removeEventListener("resume_data_updated", loadResume)
      window.removeEventListener("api_config_changed", checkApi)
    }
  }, [])

  // Auto-grow textarea mengikuti tinggi isi.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 300), 720)}px`
  }, [letter])

  const hasResume = !!resume && !isResumeEmpty(resume)
  const wordCount = letter.trim() ? letter.trim().split(/\s+/).filter(Boolean).length : 0

  const handleGenerateAi = async () => {
    setNeedsApiHelp(false)
    const config = getApiConfig()
    if (!config) {
      setNeedsApiHelp(true)
      return
    }
    if (!resume || isResumeEmpty(resume)) {
      showToast("Isi CV-mu dulu di builder, lalu surat lamaran bisa dibuat.", "error")
      return
    }
    setLoading(true)
    try {
      const text = await generateCoverLetter(resume, buildJobContext(job, position, company))
      setLetter(text)
      showToast("Surat lamaran berhasil dibuat AI. Periksa dan sesuaikan bila perlu.")
    } catch (err: any) {
      const msg = String(err?.message || "kesalahan tak diketahui")
      if (msg.startsWith("API belum dikonfigurasi")) setNeedsApiHelp(true)
      showToast(`Gagal: ${msg}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const applyManualLetter = () => {
    setShowOverwriteConfirm(false)
    if (!resume || isResumeEmpty(resume)) {
      showToast("Isi CV-mu dulu di builder, lalu kerangka surat bisa dibuat.", "error")
      return
    }
    setLetter(buildManualLetter(resume, position, company))
    showToast("Kerangka surat dibuat dari data CV. Silakan sesuaikan redaksinya.")
  }

  const handleManualLetter = () => {
    if (letter.trim().length > 0) {
      setShowOverwriteConfirm(true)
      return
    }
    applyManualLetter()
  }

  // Print mengikuti pola resume-builder: clone node surat yang dirender rapi
  // (#cover-letter-print), append ke body, ganti document.title, window.print().
  const handlePrint = () => {
    if (!letter.trim()) {
      showToast("Belum ada isi surat untuk dicetak.", "error")
      return
    }
    const source = document.getElementById("cover-letter-print")
    if (!source) return
    setPrinting(true)
    const prevTitle = document.title
    const htmlEl = document.documentElement
    const hadDarkClass = htmlEl.classList.contains("dark")
    try {
      const clone = source.cloneNode(true) as HTMLElement
      clone.id = "cover-letter-print"
      clone.style.position = "absolute"
      clone.style.left = "0"
      clone.style.top = "0"
      clone.style.width = "100%"
      clone.style.background = "white"
      clone.style.zIndex = "99999"
      document.body.appendChild(clone)
      if (hadDarkClass) htmlEl.classList.remove("dark")

      document.title = sanitizePdfTitle(
        `${resume?.personalInfo.fullName || "Surat Lamaran"} - Surat Lamaran`
      )
      window.print()

      setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone)
        setPrinting(false)
      }, 500)
    } catch (err) {
      showToast("Gagal mencetak: " + (err instanceof Error ? err.message : "kesalahan tak diketahui"), "error")
      setPrinting(false)
    } finally {
      document.title = prevTitle
      if (hadDarkClass) htmlEl.classList.add("dark")
    }
  }

  return (
    <section id="surat-lamaran" className="py-24 relative">
      {toast.show && (
        <div className="fixed top-20 right-4 z-[100] flex items-start gap-3 pl-3 pr-5 py-3 rounded-2xl shadow-2xl border border-border bg-card text-card-foreground max-w-sm animate-[toast-in_.3s_ease-out]">
          <div className={cn(
            "p-2 rounded-xl text-white shrink-0 shadow",
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          )}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {toast.type === "success" ? "Berhasil" : "Gagal"}
            </p>
            <p className="text-sm font-medium leading-snug mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {showOverwriteConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[overlay-in_.2s_ease-out]"
          onClick={() => setShowOverwriteConfirm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 animate-[modal-in_.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOverwriteConfirm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Batal"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Tulis ulang kerangka? Isi sekarang akan diganti.</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Kerangka baru disusun ulang dari data CV terbaru. Isi surat yang kamu tulis sekarang tidak bisa dikembalikan.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowOverwriteConfirm(false)}>
                Batal
              </Button>
              <Button className="flex-1 gap-2" onClick={applyManualLetter}>
                <FileText className="w-4 h-4" />
                Ya, Tulis Ulang
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container max-w-4xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary text-white shadow-xl">
              <Mail className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Surat <span className="text-primary">Lamaran</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lampiran wajib bersama CV. Isi otomatis dari CV dan lowongan kamu.
          </p>
        </div>

        {!hasResume ? (
          <Card className="border-dashed border-border/70 bg-muted/30">
            <CardContent className="py-10 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Isi CV-mu dulu di builder di atas, lalu surat lamaran terisi otomatis.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" })}
              >
                <FileText className="w-4 h-4" />
                Isi CV Sekarang
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Surat Lamaran
              </CardTitle>
              <CardDescription>
                {job
                  ? "Menggunakan data CV kamu dan persyaratan dari analisis lowongan di atas."
                  : "Menggunakan data CV kamu. Analisis lowongan dulu agar surat menyesuaikan persyaratannya."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {needsApiHelp && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        Surat dengan AI butuh Mesin AI
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                        Atur di bagian Mesin AI (10 menit, ada panduan) atau buat kerangka manual gratis.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-blue-300 dark:border-blue-700"
                      onClick={() => document.getElementById("api-settings")?.scrollIntoView({ behavior: "smooth" })}
                    >
                      <KeyRound className="w-4 h-4" />
                      Atur Mesin AI
                    </Button>
                    <Button className="flex-1 gap-2" onClick={applyManualLetter}>
                      <FileText className="w-4 h-4" />
                      Buat Kerangka Manual
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-position">Posisi yang dilamar</Label>
                  <Input
                    id="cl-position"
                    placeholder="cth. Admin Marketing"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-company">Nama perusahaan</Label>
                  <Input
                    id="cl-company"
                    placeholder="cth. PT Maju Jaya"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="cl-letter">Isi surat</Label>
                  <span className={cn(
                    "text-xs",
                    wordCount === 0 ? "text-muted-foreground" : wordCount < 200 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {wordCount > 0 ? `${wordCount} kata (ideal 250-350)` : "Belum ada isi"}
                  </span>
                </div>
                <textarea
                  id="cl-letter"
                  ref={textareaRef}
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  placeholder="Klik salah satu tombol di bawah untuk mengisi surat, atau tulis sendiri di sini. Surat bisa kamu sunting bebas sebelum dicetak."
                  className="w-full min-h-[300px] rounded-xl border-2 border-border bg-background p-4 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none overflow-hidden"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleGenerateAi} disabled={loading} className="flex-1 gap-2">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menulis surat...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Tulis dengan AI</>
                  )}
                </Button>
                <Button onClick={handleManualLetter} variant="outline" disabled={loading} className="flex-1 gap-2">
                  <ListChecks className="w-4 h-4" />
                  Buat Kerangka Manual
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  disabled={printing || !letter.trim()}
                  className="flex-1 gap-2"
                >
                  {printing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan...</>
                  ) : (
                    <><Printer className="w-4 h-4" /> Cetak / Simpan PDF</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Semua fakta di surat diambil dari data CV kamu, tidak ada pengalaman yang dikarang. Periksa kembali sebelum dikirim.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Node tersembunyi yang di-clone saat print: format surat resmi,
          hitam putih ATS-safe (styling final dari print CSS globals.css). */}
      <div id="cover-letter-print" className="hidden" aria-hidden="true">
        <div style={{ whiteSpace: "pre-wrap" }}>{letter}</div>
      </div>
    </section>
  )
}
