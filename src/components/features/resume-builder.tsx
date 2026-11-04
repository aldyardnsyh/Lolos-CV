"use client"

import { useState, useCallback, useRef, useEffect } from "react"

import {
  FileText, Plus, Trash2, Download, Sparkles, Loader2, Eye, Edit3,
  ChevronDown, ChevronUp, User, Users, Briefcase, GraduationCap, Wrench,
  Globe, Award, Languages, CheckCircle2, AlertCircle, Upload, Wand2,
  EyeOff, RotateCcw, ArrowUp, ArrowDown, AlertTriangle, Heart, X,
  LayoutTemplate, Type, ALargeSmall, FlaskConical, Save, FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatResumeDate, isSafePhotoSrc } from "@/lib/utils"
import { generateResumeContent, generateSummary, generateSampleResume, translateResume, getApiConfig, safeLocalGet, safeLocalSet, normalizeResumeData } from "@/lib/api"
import { buildMockSampleResume } from "@/lib/sample-mock"
import { useSampleGenerating } from "@/lib/sample-generation"
import {
  compressImageFile, buildResumeFile, downloadResumeFile, parseResumeFile, clearAppStorage,
} from "@/lib/resume-file"
import { CVUploader } from "@/components/features/cv-uploader"
import { DonationCard } from "@/components/features/donation-card"
import type { ResumeData, ResumeTemplate, ResumeExperience, ResumeEducation, ResumeSkill, JobPosting } from "@/types"

interface TemplateStyle {
  id: ResumeTemplate
  name: string
  desc: string
  color: string
  bg: string
  border: string
  accent: string
  textAccent: string
}

const templateStyles: Record<ResumeTemplate, TemplateStyle> = {
  corporate: {
    id: "corporate", name: "ATS Classic", desc: "Single column, ATS-friendly, clean text",
    color: "bg-blue-600", bg: "bg-blue-50", border: "border-blue-500/30",
    accent: "bg-blue-600", textAccent: "text-blue-700",
  },
  professional: {
    id: "professional", name: "ATS + Photo", desc: "Single column ATS-friendly with photo top-left",
    color: "bg-slate-700", bg: "bg-slate-50", border: "border-slate-500/30",
    accent: "bg-slate-700", textAccent: "text-slate-700",
  },
  creative: {
    id: "creative", name: "Creative", desc: "Full color blocks, skill tags, bold",
    color: "bg-purple-600", bg: "bg-purple-50", border: "border-purple-500/30",
    accent: "bg-purple-600", textAccent: "text-purple-700",
  },
  modern: {
    id: "modern", name: "Modern Minimal", desc: "Timeline experience, clean typography",
    color: "bg-emerald-600", bg: "bg-emerald-50", border: "border-emerald-500/30",
    accent: "bg-emerald-600", textAccent: "text-emerald-700",
  },
}

let idCounter = 0
const newId = () => `id_${++idCounter}_${Date.now()}`

type CvFont = "elegant" | "classic" | "professional"
type CvFontSize = "small" | "medium" | "large"

const FONT_STACKS: Record<CvFont, string> = {
  elegant: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  classic: "'Times New Roman', Times, Georgia, serif",
  professional: "Arial, Helvetica, 'Liberation Sans', sans-serif",
}

const FONT_LABELS_EN: Record<CvFont, string> = {
  elegant: "Elegant",
  classic: "Classic",
  professional: "Professional",
}
const FONT_LABELS_ID: Record<CvFont, string> = {
  elegant: "Elegan",
  classic: "Classic",
  professional: "Profesional",
}
const FONT_LABELS: Record<CvFont, string> = FONT_LABELS_EN

// Skala ukuran FONT saja (tanpa zoom). Diterapkan via CSS var --cv-scale
// di elemen .cv-paper, sehingga layout/kertas tetap, hanya font yang membesar/mengecil.
const FONT_SCALE: Record<CvFontSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.12,
}

const SIZE_LABELS_EN: Record<CvFontSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
}
const SIZE_LABELS_ID: Record<CvFontSize, string> = {
  small: "Kecil",
  medium: "Sedang",
  large: "Besar",
}
const SIZE_LABELS: Record<CvFontSize, string> = SIZE_LABELS_EN

interface AccentPalette {
  name: string
  nameId: string
  main: string
  soft: string
}

const ACCENT_PALETTES: AccentPalette[] = [
  { name: "Emerald", nameId: "Emerald", main: "#059669", soft: "#d1fae5" },
  { name: "Blue", nameId: "Biru", main: "#2563eb", soft: "#dbeafe" },
  { name: "Purple", nameId: "Ungu", main: "#7c3aed", soft: "#ede9fe" },
  { name: "Red", nameId: "Merah", main: "#dc2626", soft: "#fee2e2" },
  { name: "Teal", nameId: "Teal", main: "#0d9488", soft: "#ccfbf1" },
  { name: "Orange", nameId: "Oranye", main: "#ea580c", soft: "#ffedd5" },
]

function getDisplaySkillGroups(resume: ResumeData): Array<{ id: string; title: string; items: string[] }> {
  const groups = (resume.skillGroups ?? []).map((g) => ({
    id: g.id,
    title: (g.title || "").trim(),
    items: (g.items ?? []).map((x) => String(x ?? "").trim()).filter(Boolean),
  })).filter((g) => g.title || g.items.length > 0)
  if (groups.length > 0) return groups
  const legacy = (resume.skills ?? []).map((s) => (s?.name || "").trim()).filter(Boolean)
  if (legacy.length > 0) return [{ id: "legacy", title: "", items: legacy }]
  return []
}

function getDisplayAwards(resume: ResumeData): Array<{ id: string; title: string; organizer: string; year: string }> {
  const norm = (x: any) => {
    if (typeof x === "string") return { id: `aw_${x.slice(0, 8)}`, title: x.trim(), organizer: "", year: "" }
    return {
      id: String(x?.id ?? `aw_${Math.random().toString(36).slice(2, 8)}`),
      title: String(x?.title ?? x?.name ?? "").trim(),
      organizer: String(x?.organizer ?? "").trim(),
      month: String(x?.month ?? "").trim(),
      year: String(x?.year ?? "").trim(),
    }
  }
  const a = (resume.awards ?? []).map(norm).filter((x) => x.title)
  if (a.length > 0) return a
  const legacy = ((resume as any).achievements ?? []).map(norm).filter((x: { title: string }) => x.title)
  return legacy
}

function bulletLines(text: string | undefined | null): string[] {
  return String(text ?? "").split("\n").map((l) => l.trim()).filter(Boolean)
}

// T12: textarea auto-grow. Tinggi mengikuti isi (max ~400px) supaya user
// tidak menulis panjang di dalam kotak 80px saat keyboard mobile terbuka.
function autoGrowTextarea(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget
  el.style.height = "auto"
  el.style.height = `${Math.min(el.scrollHeight, 400)}px`
}

// Nama file PDF hasil print mengikuti document.title — buang karakter yang
// tidak boleh ada di nama file (/ \ : * ? " < > |) supaya tidak jadi "-"
// atau terpotong oleh browser/OS.
function sanitizePdfTitle(raw: string): string {
  return raw.replace(/[/\\:*?"<>|]/g, " ").replace(/\s+/g, " ").trim()
}

// T9: deteksi data contoh/mock sebelum print. Rekruter langsung menolak CV
// berisi data demo, jadi kita peringatkan dulu (bisa "Ganti Data Saya" atau
// "Tetap Cetak"). Marker = nilai dari sample mock (sample-mock.ts).
const PLACEHOLDER_MARKERS = [
  "[Nama Perusahaan]",
  "[Nama Universitas]",
]
const PLACEHOLDER_NAME = "Rina Putri"

function resumeHasPlaceholderData(resume: ResumeData): boolean {
  let serialized = ""
  try {
    serialized = JSON.stringify(resume).toLowerCase()
  } catch {
    return false
  }
  if (PLACEHOLDER_MARKERS.some((m) => serialized.includes(m.toLowerCase()))) return true
  return (resume.personalInfo?.fullName ?? "").trim() === PLACEHOLDER_NAME
}

const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function awardDate(a: { month?: string; year?: string }, lang: "id" | "en"): string {
  const mi = parseInt(String(a?.month ?? ""), 10)
  const names = lang === "en" ? MONTH_SHORT_EN : MONTH_SHORT_ID
  const m = mi >= 1 && mi <= 12 ? `${names[mi - 1]} ` : ""
  return `${m}${(a?.year ?? "").trim()}`.trim()
}

function asHref(u: string | undefined | null): string {
  const t = String(u ?? "").trim()
  if (!t) return ""
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function eduMeta(edu: ResumeEducation, lang: "id" | "en" = "en"): string {
  const parts = [edu.degree, edu.field].map((v) => (v || "").trim()).filter(Boolean)
  let s = parts.join(" - ")
  const isSchool = edu.level === "school"
  if (!isSchool && edu.gpa && edu.gpa.trim()) {
    s += (s ? " " : "") + `(${lang === "en" ? "GPA" : "IPK"}: ${edu.gpa.trim()})`
  }
  return s
}

function createEmptyResume(): ResumeData {
  return {
    personalInfo: { fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" },
    summary: "",
    experiences: [],
    organizations: [],
    education: [],
    research: [],
    skills: [],
    skillGroups: [],
    projects: [],
    certifications: [],
    achievements: [],
    awards: [],
    languages: [],
  }
}

type ResumeSectionId =
  | "summary" | "experiences" | "organizations" | "projects" | "education"
  | "research" | "skills" | "awards" | "languages"

const DEFAULT_SECTION_ORDER: ResumeSectionId[] = [
  "summary", "experiences", "organizations", "projects", "education",
  "research", "skills", "awards", "languages",
]

// Key SectionCard di builder: dua kartu identitas + semua section CV.
// Dipakai untuk state buka/tutup terkontrol (collapse otomatis di mobile).
const SECTION_CARD_KEYS = ["personal", "photo", ...DEFAULT_SECTION_ORDER]

const SECTION_LABELS_EN: Record<ResumeSectionId, string> = {
  summary: "Summary",
  experiences: "Professional Experience",
  organizations: "Organizations",
  projects: "Selected Projects",
  education: "Education",
  research: "Research",
  skills: "Skills",
  awards: "Awards & Certifications",
  languages: "Languages",
}
const SECTION_LABELS_ID: Record<ResumeSectionId, string> = {
  summary: "Ringkasan",
  experiences: "Pengalaman Profesional",
  organizations: "Organisasi",
  projects: "Proyek Pilihan",
  education: "Pendidikan",
  research: "Riset",
  skills: "Skills",
  awards: "Penghargaan & Sertifikasi",
  languages: "Bahasa",
}
// default fallback (EN) for legacy imports
const SECTION_LABELS: Record<ResumeSectionId, string> = SECTION_LABELS_EN

function getSectionLabel(id: ResumeSectionId, lang: "id" | "en"): string {
  return lang === "en" ? SECTION_LABELS_EN[id] : SECTION_LABELS_ID[id]
}

const LEGACY_SECTION_MAP: Record<string, ResumeSectionId> = {
  achievements: "awards",
  certifications: "awards",
}

function normalizeSectionOrder(v: unknown): ResumeSectionId[] {
  const raw = Array.isArray(v) ? v : []
  const mapped: ResumeSectionId[] = []
  for (const x of raw) {
    if (typeof x !== "string") continue
    if ((DEFAULT_SECTION_ORDER as string[]).includes(x)) {
      const id = x as ResumeSectionId
      if (!mapped.includes(id)) mapped.push(id)
    } else if (x in LEGACY_SECTION_MAP) {
      const id = LEGACY_SECTION_MAP[x]
      if (!mapped.includes(id)) mapped.push(id)
    }
  }
  return [...mapped, ...DEFAULT_SECTION_ORDER.filter((id) => !mapped.includes(id))]
}

function normalizeHiddenSections(v: unknown): ResumeSectionId[] {
  if (!Array.isArray(v)) return []
  const out: ResumeSectionId[] = []
  for (const x of v) {
    if (typeof x !== "string") continue
    if ((DEFAULT_SECTION_ORDER as string[]).includes(x)) {
      const id = x as ResumeSectionId
      if (!out.includes(id)) out.push(id)
    } else if (x in LEGACY_SECTION_MAP) {
      const id = LEGACY_SECTION_MAP[x]
      if (!out.includes(id)) out.push(id)
    }
  }
  return out
}

// Tinggi area konten 1 halaman A4 dalam px (297mm - margin cetak 10mm atas+bawah, @96dpi).
// Dipakai hanya sebagai indikator overflow / garis batas halaman (tanpa zoom).
const A4_CONTENT_PX = 1047

function ItemMoveButtons({ onUp, onDown, upDisabled, downDisabled, label }: { onUp: () => void; onDown: () => void; upDisabled: boolean; downDisabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onUp} disabled={upDisabled} title="Pindah ke atas" aria-label={`Pindah ${label} ke atas`} className="p-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"><ArrowUp className="w-4 h-4" /></button>
      <button onClick={onDown} disabled={downDisabled} title="Pindah ke bawah" aria-label={`Pindah ${label} ke bawah`} className="p-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"><ArrowDown className="w-4 h-4" /></button>
    </div>
  )
}

function SectionCard({
  title, icon: Icon, color, children, defaultOpen = true, open: openProp, onOpenChange,
}: {
  title: string; icon: any; color: string; children: React.ReactNode; defaultOpen?: boolean
  open?: boolean; onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp !== undefined ? openProp : internalOpen
  const setOpen = (next: boolean) => {
    if (openProp !== undefined && onOpenChange) {
      onOpenChange(next)
    } else {
      setInternalOpen(next)
    }
  }
  return (
    <Card className="border-border/50">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg text-white", color)}><Icon className="w-4 h-4" /></div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <CardContent className="pt-2 pb-4">{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}

export function ResumeBuilder() {
  const [resume, setResume] = useState<ResumeData>(createEmptyResume)
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>("corporate")
  const [preview, setPreview] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [newLang, setNewLang] = useState("")
  const [newCert, setNewCert] = useState("")
  // Draft teks mentah agar koma/parse tidak memangsa ketikan per keystroke.
  // Parsing (split koma/newline) hanya saat blur atau Enter.
  const [techDrafts, setTechDrafts] = useState<Record<string, string>>({})
  const [skillDrafts, setSkillDrafts] = useState<Record<string, string>>({})
  const parseList = (raw: string): string[] =>
    String(raw ?? "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" })
  const [showImportTools, setShowImportTools] = useState(false)
  const [generatingSample, setGeneratingSample] = useSampleGenerating()
  const [exportingPdf, setExportingPdf] = useState(false)
  // Default bahasa CV: "id" untuk semua user baru (pasar utama Indonesia).
  // Preferensi tersimpan di-restorasi oleh efek mount di bawah (dipisah agar
  // tidak ada hydration mismatch saat komponen di-SSR).
  const [resumeLang, setResumeLang] = useState<"id" | "en">("id")
  const [translating, setTranslating] = useState(false)
  const [cvFont, setCvFont] = useState<CvFont>("elegant")
  const [cvSize, setCvSize] = useState<CvFontSize>("medium")
  const [accentIdx, setAccentIdx] = useState(0)
  const [sectionOrder, setSectionOrder] = useState<ResumeSectionId[]>(DEFAULT_SECTION_ORDER)
  const [hiddenSections, setHiddenSections] = useState<ResumeSectionId[]>([])
  // Default OFF: pemadatan 1 halaman memaksa zoom ekstrem (font ~5px) untuk
  // CV panjang. User yang memang mau 1 halaman bisa menyalakannya sendiri.
  const [compactOnePage, setCompactOnePage] = useState(false)
  const [contentH, setContentH] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)
  // Throttle peringatan kuota localStorage: max 1x per 10 detik.
  const lastStorageWarnRef = useRef(0)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [preGenerate, setPreGenerate] = useState<ResumeData | null>(null)
  const [showSupportPrompt, setShowSupportPrompt] = useState(false)
  // Guard data contoh sebelum print (T9) + konfirmasi hapus semua data (T7).
  const [showPlaceholderWarning, setShowPlaceholderWarning] = useState(false)
  const [showWipeConfirm, setShowWipeConfirm] = useState(false)
  // T10: state terkontrol buka/tutup SectionCard. Key = id section atau
  // "personal"/"photo". Undefined fallback: terbuka (kecuali foto defaultOpen false).
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  // Refs untuk autosave debounce (T1), status hydrate, dan guard placeholder.
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autosaveDataRef = useRef<ResumeData | null>(null)
  const placeholderSkipRef = useRef(false)
  const importFileRef = useRef<HTMLInputElement>(null)
  // T1: id timer toast disimpan di ref agar clearTimeout bisa menghentikan
  // timer toast sebelumnya; dua toast beruntun tidak saling menutup prematur.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // T3: ref tombol aksi utama tiap modal; difokuskan otomatis saat modal terbuka.
  const generateConfirmActionRef = useRef<HTMLButtonElement>(null)
  const supportPromptActionRef = useRef<HTMLDivElement>(null)
  const placeholderWarningActionRef = useRef<HTMLButtonElement>(null)
  const wipeConfirmActionRef = useRef<HTMLButtonElement>(null)

  // Edit & preview menimpa di tempat yang sama: posisi scroll tidak
  // disentuh sama sekali agar tidak ada lompatan paksa.
  const togglePreview = () => {
    setPreview((p) => !p)
  }

  // Generate bersifat destruktif (replace seluruh isi) → minta konfirmasi
  // bila sudah ada data, plus backup otomatis + tombol urungkan.
  const requestGenerate = () => {
    if (generatingSample) return
    if (isResumeEmpty) {
      handleGenerateSample()
      return
    }
    setShowGenerateConfirm(true)
  }

  const confirmGenerate = () => {
    try {
      safeLocalSet("resume_data_before_generate", JSON.stringify(resume))
    } catch {}
    setPreGenerate(resume)
    setShowGenerateConfirm(false)
    handleGenerateSample()
  }

  const undoGenerate = () => {
    const backup = preGenerate ?? (() => {
      try {
        const raw = safeLocalGet("resume_data_before_generate")
        return raw ? normalizeResumeData(JSON.parse(raw)) : null
      } catch {
        return null
      }
    })()
    if (!backup) {
      showToast("Tidak ada backup untuk dikembalikan", "error")
      return
    }
    setResume(normalizeResumeData(backup))
    setPreGenerate(null)
    try { safeLocalSet("resume_data_before_generate", "") } catch {}
    showToast(resumeLang === "en" ? "Restored data before generate" : "Data sebelum generate dikembalikan")
  }

  useEffect(() => {
    const stored = safeLocalGet("resume_data")
    if (stored) {
      try { setResume(normalizeResumeData(JSON.parse(stored))) } catch {}
    }
    const backup = safeLocalGet("resume_data_before_generate")
    if (backup) {
      try {
        const parsed = normalizeResumeData(JSON.parse(backup))
        if (parsed.personalInfo.fullName || parsed.summary || parsed.experiences.length > 0) {
          setPreGenerate(parsed)
        }
      } catch {}
    }
    const storedLang = safeLocalGet("resume_lang")
    if (storedLang === "id" || storedLang === "en") setResumeLang(storedLang)
    const storedStyle = safeLocalGet("resume_style")
    if (storedStyle) {
      try {
        const s = JSON.parse(storedStyle)
        if (s.font in FONT_STACKS) setCvFont(s.font)
        if (s.size in FONT_SCALE) setCvSize(s.size)
        if (Number.isInteger(s.accent) && s.accent >= 0 && s.accent < ACCENT_PALETTES.length) setAccentIdx(s.accent)
      } catch {}
    }
    const storedLayout = safeLocalGet("resume_layout")
    if (storedLayout) {
      try {
        const l = JSON.parse(storedLayout)
        if (l && typeof l === "object") {
          setSectionOrder(normalizeSectionOrder((l as { order?: unknown }).order))
          setHiddenSections(normalizeHiddenSections((l as { hidden?: unknown }).hidden))
          if (typeof (l as { compact?: unknown }).compact === "boolean") {
            setCompactOnePage((l as { compact: boolean }).compact)
          } else if ((l as { pages?: unknown }).pages === 2) {
            setCompactOnePage(false) // migrasi preferensi lama
          }
        }
      } catch {}
    }

    const handleResumeUpdate = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail
      if (!detail) return
      if (typeof detail === "object" && detail !== null && "resume" in detail && (detail as { resume?: unknown }).resume) {
        const wrapped = detail as { resume: ResumeData; lang?: unknown }
        // Jalur analyzer/optimizer menulis backup ke key "resume_data_before_generate"
        // sebelum menimpa. Ambil di sini supaya tombol "Urungkan generate terakhir"
        // juga berlaku untuk data yang datang dari luar builder.
        try {
          const backupRaw = safeLocalGet("resume_data_before_generate")
          if (backupRaw) setPreGenerate(normalizeResumeData(JSON.parse(backupRaw)))
        } catch {}
        setResume(normalizeResumeData(wrapped.resume))
        if (wrapped.lang === "id" || wrapped.lang === "en") {
          setResumeLang(wrapped.lang)
          safeLocalSet("resume_lang", wrapped.lang)
        }
        return
      }
      setResume(normalizeResumeData(detail as ResumeData))
    }
    window.addEventListener("resume_data_updated", handleResumeUpdate)

    // Tombol "Gunakan Template" di section templates mengirim key template.
    const handleUseTemplate = (e: Event) => {
      const t = (e as CustomEvent<{ template?: unknown }>).detail?.template
      if (typeof t === "string" && t in templateStyles) {
        setSelectedTemplate(t as ResumeTemplate)
      }
      document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" })
    }
    window.addEventListener("use_template", handleUseTemplate)

    return () => {
      window.removeEventListener("resume_data_updated", handleResumeUpdate)
      window.removeEventListener("use_template", handleUseTemplate)
    }
  }, [])

  // CTA "Coba Tanpa API Key (Gratis)" di hero dan kartu error job-analyzer
  // mengirim event "demo_generate" → jalankan jalur Generate Sample CV yang
  // sama persis dengan tombol di builder (requestGenerate). Dengan begitu,
  // bila CV sudah berisi, modal konfirmasi data-loss tetap tampil dan tidak
  // pernah dilewati. Deps mengikuti requestGenerate agar keputusan konfirmasi
  // selalu membaca isi CV terkini, bukan closure saat mount.
  useEffect(() => {
    const handleDemoGenerate = () => requestGenerate()
    window.addEventListener("demo_generate", handleDemoGenerate)
    return () => window.removeEventListener("demo_generate", handleDemoGenerate)
  }, [requestGenerate])

  // T10a: preferensi buka/tutup SectionCard dipersist. Saat mount di layar
  // <1024px tanpa preferensi tersimpan, tutup semua kecuali Data Pribadi agar
  // user mobile tidak scroll maraton 11 section terbuka.
  useEffect(() => {
    const storedOpen = safeLocalGet("resume_sections_open")
    if (storedOpen) {
      try {
        const parsed = JSON.parse(storedOpen)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setOpenSections(parsed as Record<string, boolean>)
          return
        }
      } catch {}
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const initial: Record<string, boolean> = {}
      for (const key of SECTION_CARD_KEYS) initial[key] = key === "personal"
      setOpenSections(initial)
      safeLocalSet("resume_sections_open", JSON.stringify(initial))
    }
  }, [])

  const setSectionCardOpen = (key: string, open: boolean) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: open }
      safeLocalSet("resume_sections_open", JSON.stringify(next))
      return next
    })
  }
  const isSectionCardOpen = (key: string, fallback = true) => openSections[key] ?? fallback

  // Autosave dengan debounce 500ms: stringify seluruh resume tiap ketikan itu
  // berat, jadi tulis ke localStorage hanya setelah user berhenti mengetik.
  useEffect(() => {
    autosaveDataRef.current = resume
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      const ok = safeLocalSet("resume_data", JSON.stringify(autosaveDataRef.current))
      if (!ok) {
        // Kuota localStorage penuh (biasanya karena foto base64) → autosave
        // gagal senyap. Beri tahu user, tapi jangan spam toast per ketikan.
        const now = Date.now()
        if (now - lastStorageWarnRef.current > 10_000) {
          lastStorageWarnRef.current = now
          showToast("Penyimpanan browser penuh (biasanya karena foto). Data terbaru TIDAK tersimpan. Unduh atau simpan data CV-mu sekarang.", "error")
        }
      }
    }, 500)
  }, [resume])

  // Flush autosave segera saat tab ditutup / disembunyikan, supaya data yang
  // baru diketik (masih menunggu debounce) tidak hilang.
  useEffect(() => {
    const flushAutosave = () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      const data = autosaveDataRef.current
      if (data) safeLocalSet("resume_data", JSON.stringify(data))
    }
    const onBeforeUnload = () => flushAutosave()
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushAutosave()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      // Unmount dengan data belum tersimpan (nav/refresh via framework) → flush.
      flushAutosave()
    }
  }, [])

  useEffect(() => {
    safeLocalSet("resume_style", JSON.stringify({ font: cvFont, size: cvSize, accent: accentIdx }))
  }, [cvFont, cvSize, accentIdx])

  useEffect(() => {
    safeLocalSet("resume_layout", JSON.stringify({ order: sectionOrder, hidden: hiddenSections, compact: compactOnePage }))
  }, [sectionOrder, hiddenSections, compactOnePage])

  // Ukur tinggi KERTAS (.cv-paper) tanpa zoom — untuk estimasi jumlah halaman.
  // (Dulu mengukur container luar yang mencakup padding + banner, sehingga
  // estimasi melar dan muncul garis "Halaman 3" hantu.) Preview tidak di-zoom:
  // ukuran font diatur via CSS var --cv-scale di .cv-paper.
  useEffect(() => {
    if (!preview) return
    const measure = () => {
      const root = previewRef.current
      if (!root) return
      const paper = root.querySelector(".cv-paper") as HTMLElement | null
      const h = (paper ?? root).scrollHeight
      if (!h || !Number.isFinite(h)) return
      setContentH((prev) => (prev === Math.round(h) ? prev : Math.round(h)))
    }
    measure()
    window.addEventListener("resize", measure)
    let cancelled = false
    document.fonts?.ready.then(() => { if (!cancelled) measure() }).catch(() => {})
    return () => {
      cancelled = true
      window.removeEventListener("resize", measure)
    }
  }, [preview, resume, selectedTemplate, cvFont, cvSize, accentIdx, sectionOrder, hiddenSections, resumeLang])

  const estPages = contentH > 0 ? Math.max(1, Math.ceil(contentH / A4_CONTENT_PX)) : 1
  const compactPct = contentH > A4_CONTENT_PX
    ? Math.max(50, Math.round((A4_CONTENT_PX / contentH) * 100))
    : 100

  const orderOf = (id: ResumeSectionId) => {
    const i = sectionOrder.indexOf(id)
    return i === -1 ? 99 : i
  }
  const isSectionVisible = (id: ResumeSectionId) => !hiddenSections.includes(id)

  const moveSection = (id: ResumeSectionId, dir: -1 | 1) => {
    setSectionOrder((prev) => {
      const i = prev.indexOf(id)
      const j = i + dir
      if (i === -1 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      next[i] = next[j]
      next[j] = id
      return next
    })
  }

  const moveResumeListItem = <T,>(list: T[], index: number, dir: -1 | 1): T[] => {
    const j = index + dir
    if (index < 0 || j < 0 || j >= list.length) return list
    const next = [...list]
    const tmp = next[index]; next[index] = next[j]; next[j] = tmp
    return next
  }
  const moveExperience = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, experiences: moveResumeListItem(prev.experiences, index, dir) }))
  const moveOrganization = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, organizations: moveResumeListItem(prev.organizations ?? [], index, dir) }))
  const moveResearch = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, research: moveResumeListItem(prev.research ?? [], index, dir) }))
  const moveProject = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, projects: moveResumeListItem(prev.projects, index, dir) }))
  const moveEducation = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, education: moveResumeListItem(prev.education, index, dir) }))
  const moveSkillGroup = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, skillGroups: moveResumeListItem(prev.skillGroups ?? [], index, dir) }))
  const moveAward = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, awards: moveResumeListItem(prev.awards ?? [], index, dir) }))
  const moveCertification = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, certifications: moveResumeListItem(prev.certifications ?? [], index, dir) }))
  const moveLanguage = (index: number, dir: -1 | 1) => setResume((prev) => ({ ...prev, languages: moveResumeListItem(prev.languages, index, dir) }))

  const toggleSection = (id: ResumeSectionId) => {
    setHiddenSections((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const resetLayout = () => {
    setSectionOrder(DEFAULT_SECTION_ORDER)
    setHiddenSections([])
  }

  const showToast = (message: string, type: "success" | "error" = "success") => {
    // T1: hentikan timer toast sebelumnya supaya toast kedua yang muncul
    // berdekatan tidak langsung ditutup oleh timer toast pertama.
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ show: true, message, type })
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null
      setToast({ show: false, message: "", type: "success" })
    }, 3000)
  }

  // T3: Escape menutup modal yang sedang aktif. Listener hanya terpasang
  // selama ada modal terbuka, jadi tidak mengganggu input di form.
  useEffect(() => {
    const anyOpen = showGenerateConfirm || showSupportPrompt || showPlaceholderWarning || showWipeConfirm
    if (!anyOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (showWipeConfirm) setShowWipeConfirm(false)
      else if (showPlaceholderWarning) setShowPlaceholderWarning(false)
      else if (showSupportPrompt) setShowSupportPrompt(false)
      else if (showGenerateConfirm) setShowGenerateConfirm(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [showGenerateConfirm, showSupportPrompt, showPlaceholderWarning, showWipeConfirm])

  // T3: saat modal terbuka, fokuskan tombol aksi utamanya agar keyboard user
  // langsung berada di dalam dialog, bukan di body halaman.
  useEffect(() => {
    if (showGenerateConfirm) generateConfirmActionRef.current?.focus()
  }, [showGenerateConfirm])
  useEffect(() => {
    if (showSupportPrompt) supportPromptActionRef.current?.focus()
  }, [showSupportPrompt])
  useEffect(() => {
    if (showPlaceholderWarning) placeholderWarningActionRef.current?.focus()
  }, [showPlaceholderWarning])
  // Modal wipe bersifat destruktif permanen (tanpa undo) → fokus diarahkan ke
  // tombol aman "Batal" mengikuti pola alert-dialog WAI-ARIA APG.
  useEffect(() => {
    if (showWipeConfirm) wipeConfirmActionRef.current?.focus()
  }, [showWipeConfirm])

  const isResumeEmpty =
    !resume.personalInfo.fullName &&
    !resume.summary &&
    resume.experiences.length === 0 &&
    (resume.organizations ?? []).length === 0 &&
    resume.education.length === 0 &&
    (resume.research ?? []).length === 0 &&
    resume.skills.length === 0 &&
    (resume.skillGroups ?? []).length === 0

  // T10b: progress pengisian CV dari 8 kategori (ringkasan, pengalaman,
  // organisasi, proyek, pendidikan, riset, skills, penghargaan/sertifikasi).
  const filledSections = [
    resume.summary.trim().length > 0,
    resume.experiences.length > 0,
    (resume.organizations ?? []).length > 0,
    resume.projects.length > 0,
    resume.education.length > 0,
    (resume.research ?? []).length > 0,
    getDisplaySkillGroups(resume).length > 0,
    getDisplayAwards(resume).length > 0 || (resume.certifications ?? []).length > 0,
  ].filter(Boolean).length

  const handleGenerateSample = async () => {
    if (generatingSample) return
    setGeneratingSample(true)
    try {
      const stored = safeLocalGet("job_analysis")
      if (!stored) {
        // Pertahankan bahasa yang sedang aktif di builder (default "id").
        // Dulu dipaksa "en", CV lamaran Indonesia jadi bahasa Inggris.
        setResume(buildMockSampleResume(null))
        setShowImportTools(false)
        showToast("Contoh CV dibuat dari data sample. Lengkapi dengan data aslimu.")
        return
      }
      const jobPosting: JobPosting = JSON.parse(stored)
      const hasApi = !!getApiConfig()
      const sample = hasApi ? await generateSampleResume(jobPosting) : buildMockSampleResume(jobPosting)
      setResume(sample)
      setShowImportTools(false)
      showToast(
        hasApi
          ? "Sample CV berhasil dibuat! Silakan disesuaikan."
          : "Contoh CV dibuat dari lowonganmu (tanpa API). Silakan disesuaikan."
      )
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, "error")
    } finally {
      setGeneratingSample(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input agar memilih file yang sama lagi tetap memicu onChange.
    e.target.value = ""
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      showToast("Foto terlalu besar, coba foto lain", "error")
      return
    }
    try {
      // Kompres via canvas (sisi terpanjang max 800px, JPEG kualitas menurun
      // bertahap, target <= 300KB) sebelum disimpan sebagai base64, supaya
      // foto tidak menggedor kuota localStorage (~5MB).
      const dataUrl = await compressImageFile(file)
      updatePersonalInfo("photo", dataUrl)
      showToast("Foto dioptimalkan otomatis agar hemat penyimpanan")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Foto terlalu besar, coba foto lain", "error")
    }
  }

  const handleToggleLanguage = async (next: "id" | "en") => {
    if (next === resumeLang || translating) return
    if (isResumeEmpty) {
      setResumeLang(next)
      safeLocalSet("resume_lang", next)
      return
    }
    setTranslating(true)
    try {
      const translated = await translateResume(resume, next)
      setResume(translated)
      setResumeLang(next)
      safeLocalSet("resume_lang", next)
      showToast(next === "en" ? "CV diterjemahkan ke Bahasa Inggris" : "CV diterjemahkan ke Bahasa Indonesia")
    } catch (err: any) {
      showToast(`Gagal menerjemahkan: ${err.message}`, "error")
    } finally {
      setTranslating(false)
    }
  }

  const updatePersonalInfo = (field: string, value: string | undefined) => {
    setResume((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }))
  }

  const addExperience = () => {
    setResume((prev) => ({
      ...prev,
      experiences: [...prev.experiences, {
        id: newId(), company: "", position: "", location: "", startDate: "", endDate: "", current: false, description: "",
      }],
    }))
  }

  const updateExperience = (id: string, field: string, value: any) => {
    setResume((prev) => ({
      ...prev,
      experiences: prev.experiences.map((e) => e.id === id ? { ...e, [field]: value } : e),
    }))
  }

  const removeExperience = (id: string) => {
    setResume((prev) => ({ ...prev, experiences: prev.experiences.filter((e) => e.id !== id) }))
  }

  const addEducation = () => {
    setResume((prev) => ({
      ...prev,
      education: [...prev.education, {
        id: newId(), institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "", level: "univ" as const,
        thesisTitle: "", thesisDescription: "", researchTitle: "", researchDescription: "",
      }],
    }))
  }

  const updateEducation = (id: string, field: string, value: any) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.map((e) => e.id === id ? { ...e, [field]: value } : e),
    }))
  }

  const removeEducation = (id: string) => {
    setResume((prev) => ({ ...prev, education: prev.education.filter((e) => e.id !== id) }))
  }

  const addOrganization = () => {
    setResume((prev) => ({
      ...prev,
      organizations: [...(prev.organizations ?? []), {
        id: newId(), organization: "", position: "", location: "", startDate: "", endDate: "", current: false, description: "",
      }],
    }))
  }

  const updateOrganization = (id: string, field: string, value: any) => {
    setResume((prev) => ({
      ...prev,
      organizations: (prev.organizations ?? []).map((o) => o.id === id ? { ...o, [field]: value } : o),
    }))
  }

  const removeOrganization = (id: string) => {
    setResume((prev) => ({ ...prev, organizations: (prev.organizations ?? []).filter((o) => o.id !== id) }))
  }

  const addResearch = () => {
    setResume((prev) => ({
      ...prev,
      research: [...(prev.research ?? []), {
        id: newId(), title: "", status: "", organization: "", location: "", startDate: "", endDate: "", current: false, description: "",
      }],
    }))
  }

  const updateResearch = (id: string, field: string, value: any) => {
    setResume((prev) => ({
      ...prev,
      research: (prev.research ?? []).map((x) => x.id === id ? { ...x, [field]: value } : x),
    }))
  }

  const removeResearch = (id: string) => {
    setResume((prev) => ({ ...prev, research: (prev.research ?? []).filter((x) => x.id !== id) }))
  }

  const addSkillGroup = () => {
    setResume((prev) => ({
      ...prev,
      skillGroups: [...(prev.skillGroups ?? []), { id: newId(), title: "", items: [] }],
    }))
  }

  const updateSkillGroup = (id: string, field: "title" | "items", value: string | string[]) => {
    setResume((prev) => ({
      ...prev,
      skillGroups: (prev.skillGroups ?? []).map((g) => {
        if (g.id !== id) return g
        if (field === "title") return { ...g, title: String(value) }
        const items = Array.isArray(value)
          ? value.map((x) => String(x).trim()).filter(Boolean)
          : String(value).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
        return { ...g, items }
      }),
    }))
  }

  const removeSkillGroup = (id: string) => {
    setResume((prev) => ({ ...prev, skillGroups: (prev.skillGroups ?? []).filter((g) => g.id !== id) }))
  }

  const addAwardItem = () => {
    setResume((prev) => ({
      ...prev,
      awards: [...(prev.awards ?? []), { id: newId(), title: "", organizer: "", month: "", year: "" }],
    }))
  }

  const updateAwardItem = (id: string, field: string, value: string) => {
    setResume((prev) => ({
      ...prev,
      awards: (prev.awards ?? []).map((a) => {
        const item = typeof a === "string" ? { id: newId(), title: a, organizer: "", month: "", year: "" } : a
        return item.id === id ? { ...item, [field]: value } : item
      }),
    }))
  }

  const removeAwardItem = (id: string) => {
    setResume((prev) => ({ ...prev, awards: (prev.awards ?? []).filter((a) => (typeof a === "string" ? a : a.id) !== id) }))
  }

  const addCertification = () => {
    if (!newCert.trim()) return
    setResume((prev) => ({ ...prev, certifications: [...(prev.certifications ?? []), newCert.trim()] }))
    setNewCert("")
  }

  const removeCertification = (index: number) => {
    setResume((prev) => ({ ...prev, certifications: (prev.certifications ?? []).filter((_, i) => i !== index) }))
  }

  const addLanguage = () => {
    if (!newLang.trim()) return
    setResume((prev) => ({ ...prev, languages: [...prev.languages, newLang.trim()] }))
    setNewLang("")
  }

  const removeLanguage = (index: number) => {
    setResume((prev) => ({ ...prev, languages: prev.languages.filter((_, i) => i !== index) }))
  }

  const addProject = () => {
    setResume((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: newId(), name: "", description: "", url: "", technologies: [] }],
    }))
  }

  const updateProject = (id: string, field: string, value: any) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => p.id === id ? { ...p, [field]: value } : p),
    }))
  }

  const removeProject = (id: string) => {
    setResume((prev) => ({ ...prev, projects: prev.projects.filter((p) => p.id !== id) }))
  }

  const handleAiGenerate = useCallback(async (section: string) => {
    const config = getApiConfig()
    if (!config) {
      showToast("Silakan konfigurasi API Key terlebih dahulu", "error")
      return
    }
    setAiLoading(section)
    try {
      if (section === "summary") {
        const targetRole = resume.experiences[0]?.position || "Posisi target"
        const skillText = getDisplaySkillGroups(resume).flatMap((g) => g.items).join(", ")
        const content = await generateSummary(
          resume.experiences.map((e) => `${e.position} di ${e.company}`).join(", ") || "Belum ada pengalaman",
          skillText || "Belum ada skill",
          targetRole,
          resumeLang
        )
        setResume((prev) => ({ ...prev, summary: content }))
      } else if (section === "experience") {
        for (const exp of resume.experiences) {
          if (!exp.description) {
            const content = await generateResumeContent("pengalaman kerja",
              `${exp.position} di ${exp.company || "perusahaan"}`, resumeLang)
            updateExperience(exp.id, "description", content)
          }
        }
      }
      showToast(`Konten ${section} berhasil dibuat AI!`)
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, "error")
    } finally {
      setAiLoading(null)
    }
  }, [resume])

  const handleDownloadPdf = async () => {
    setExportingPdf(true)

    // Simpan judul & tema lama; keduanya dipulihkan di finally setelah print.
    const prevTitle = document.title
    const htmlEl = document.documentElement
    const hadDarkClass = htmlEl.classList.contains("dark")

    try {
      let previewEl = document.getElementById("resume-preview-content")
      if (!previewEl) {
        // Auto-switch preview baru saja terjadi → preview mungkin belum selesai
        // render. Tunggu singkat lalu coba sekali lagi.
        await new Promise((r) => setTimeout(r, 300))
        previewEl = document.getElementById("resume-preview-content")
        if (!previewEl) {
          showToast("Preview CV belum siap. Coba lagi sesaat lagi.", "error")
          setExportingPdf(false)
          return
        }
      }

      // Clone and append to body for clean print.
      // Preview tidak di-zoom; skala font via CSS var --cv-scale di .cv-paper.
      // Mode 1 halaman: padatkan hasil PDF agar pas 1 halaman A4 dengan
      // mengecilkan zoom clone secukupnya (hanya saat export, preview tetap).
      const clone = previewEl.cloneNode(true) as HTMLElement
      clone.id = "resume-print-clone"
      clone.style.position = "absolute"
      clone.style.left = "0"
      clone.style.top = "0"
      clone.style.width = "100%"
      clone.style.padding = "0"
      clone.style.background = "white"
      clone.style.zIndex = "99999"
      document.body.appendChild(clone)

      // Belt-and-suspenders print dark mode: lepas class "dark" selama export
      // agar varian dark:* (mis. teks putih) tidak ikut tercetak. CSS variabel
      // tema di-override ke nilai light di print CSS (globals.css).
      if (hadDarkClass) htmlEl.classList.remove("dark")

      // Small delay for render
      await new Promise((r) => setTimeout(r, 150))
      if (compactOnePage) {
        try {
          const paper = clone.querySelector(".cv-paper") as HTMLElement | null
          const h = paper ? paper.scrollHeight : clone.scrollHeight
          if (h && Number.isFinite(h) && h > A4_CONTENT_PX) {
            const fit = A4_CONTENT_PX / h
            const rounded = Math.max(0.5, Math.round(fit * 1000) / 1000)
            clone.style.zoom = String(rounded)
            // Beri waktu render ulang setelah zoom sebelum print
            await new Promise((r) => setTimeout(r, 100))
          }
        } catch {}
      }

      // Nama file PDF = nama kandidat (window.print() memakai document.title
      // sebagai nama default file yang disimpan).
      const pi = resume.personalInfo
      document.title = sanitizePdfTitle(`${pi.fullName || "CV"} - ${pi.headline || "CV"}`)
      window.print()

      // window.print() bersifat blocking: sampai baris ini dijalankan berarti
      // dialog print sudah selesai (user sudah cetak/simpan/batal). Modal
      // donasi sekarang muncul DI SINI, sekali, bukan menyela sebelum print.
      if (safeLocalGet("donation_modal_dismissed") !== "1") {
        setShowSupportPrompt(true)
      }

      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(clone)
        setExportingPdf(false)
      }, 500)
    } catch (err) {
      showToast("Gagal export: " + (err instanceof Error ? err.message : "unknown error"), "error")
      setExportingPdf(false)
    } finally {
      document.title = prevTitle
      if (hadDarkClass) htmlEl.classList.add("dark")
    }
  }

  // Lanjutan alur cetak: bila user masih di mode edit, auto-switch ke preview
  // dulu lalu beri delay singkat untuk render sebelum print.
  const continuePrintFlow = () => {
    if (!preview) {
      setPreview(true)
      setTimeout(() => handleDownloadPdf(), 350)
      return
    }
    handleDownloadPdf()
  }

  // Gerbang tunggal tombol "Cetak / Simpan PDF" (kartu Export + sticky bar
  // mobile): guard data contoh dijalankan SEBELUM title/dark/print disentuh.
  const startPrintFlow = () => {
    if (!placeholderSkipRef.current && resumeHasPlaceholderData(resume)) {
      setShowPlaceholderWarning(true)
      return
    }
    continuePrintFlow()
  }

  const dismissDonationForever = () => {
    safeLocalSet("donation_modal_dismissed", "1")
    setShowSupportPrompt(false)
    showToast("Modal donasi tidak akan ditampilkan lagi")
  }

  // T7: export seluruh data CV ke file JSON.
  const handleExportJson = () => {
    try {
      const payload = buildResumeFile({
        resume,
        lang: resumeLang,
        style: { font: cvFont, size: cvSize, accent: accentIdx },
        layout: { order: sectionOrder, hidden: hiddenSections, compact: compactOnePage },
        sectionOrder,
        hiddenSections,
      })
      downloadResumeFile(payload, resume.personalInfo.fullName || "cv")
      showToast("Data CV disimpan ke file .json. Simpan baik-baik ya!")
    } catch {
      showToast("Gagal menyimpan data ke file", "error")
    }
  }

  // T7: muat data CV dari file JSON hasil export.
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseResumeFile(text)
      setResume(normalizeResumeData(parsed.resume_data))
      setResumeLang(parsed.resume_lang)
      safeLocalSet("resume_lang", parsed.resume_lang)
      if (parsed.resume_style && typeof parsed.resume_style === "object" && !Array.isArray(parsed.resume_style)) {
        const s = parsed.resume_style as { font?: unknown; size?: unknown; accent?: unknown }
        if (typeof s.font === "string" && s.font in FONT_STACKS) setCvFont(s.font as CvFont)
        if (typeof s.size === "string" && s.size in FONT_SCALE) setCvSize(s.size as CvFontSize)
        if (typeof s.accent === "number" && Number.isInteger(s.accent) && s.accent >= 0 && s.accent < ACCENT_PALETTES.length) {
          setAccentIdx(s.accent)
        }
      }
      if (parsed.resume_layout && typeof parsed.resume_layout === "object" && !Array.isArray(parsed.resume_layout)) {
        const l = parsed.resume_layout as { order?: unknown; hidden?: unknown; compact?: unknown }
        setSectionOrder(normalizeSectionOrder(l.order))
        setHiddenSections(normalizeHiddenSections(l.hidden))
        if (typeof l.compact === "boolean") setCompactOnePage(l.compact)
      } else {
        if (Array.isArray(parsed.sectionOrder)) setSectionOrder(normalizeSectionOrder(parsed.sectionOrder))
        if (Array.isArray(parsed.hiddenSections)) setHiddenSections(normalizeHiddenSections(parsed.hiddenSections))
      }
      setShowImportTools(false)
      showToast("Data CV berhasil dimuat dari file")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memuat file", "error")
    }
  }

  // T7: hapus semua data milik LolosCV dari localStorage + reset state.
  const handleWipeAllData = () => {
    clearAppStorage()
    setShowWipeConfirm(false)
    setResume(createEmptyResume())
    setPreGenerate(null)
    setResumeLang("id")
    setCvFont("elegant")
    setCvSize("medium")
    setAccentIdx(0)
    setSectionOrder(DEFAULT_SECTION_ORDER)
    setHiddenSections([])
    setCompactOnePage(false)
    setOpenSections({})
    setShowImportTools(false)
    placeholderSkipRef.current = false
    showToast("Semua data LolosCV dihapus dari browser ini")
  }

  // T11: preset fresh graduate. Hanya menyembunyikan section di preview/PDF,
  // data riset/proyek/organisasi tetap ada (tidak dihapus).
  const applyFreshGraduatePreset = () => {
    setHiddenSections(["research", "projects", "organizations"])
    showToast("Preset Sederhana aktif: Riset, Proyek, dan Organisasi disembunyikan. Datamu tidak hilang.")
  }

  const template = templateStyles[selectedTemplate]
  const pal = ACCENT_PALETTES[accentIdx] ?? ACCENT_PALETTES[0]

  return (
    <section id="builder" className="py-24 relative">
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-[100] flex items-start gap-3 pl-3 pr-5 py-3 rounded-2xl shadow-2xl border border-border bg-card text-card-foreground max-w-sm animate-[toast-in_.3s_ease-out]"
        >
          <div className={cn(
            "p-2 rounded-xl text-white shrink-0 shadow",
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          )}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {toast.type === "success"
                ? (resumeLang === "en" ? "Success" : "Berhasil")
                : (resumeLang === "en" ? "Failed" : "Gagal")}
            </p>
            <p className="text-sm font-medium leading-snug mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

      {showGenerateConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[overlay-in_.2s_ease-out]"
          onClick={() => setShowGenerateConfirm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 animate-[modal-in_.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={resumeLang === "en" ? "Replace entire CV?" : "Ganti seluruh isi CV?"}
          >
            <button
              onClick={() => setShowGenerateConfirm(false)}
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
                <h3 className="font-bold">
                  {resumeLang === "en" ? "Replace entire CV?" : "Ganti seluruh isi CV?"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {resumeLang === "en"
                    ? "Generate will overwrite everything you filled in. Your current data is backed up automatically and can be undone."
                    : "Generate akan menimpa semua data yang sudah kamu isi. Data saat ini dibackup otomatis dan bisa diurungkan."}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowGenerateConfirm(false)}>
                {resumeLang === "en" ? "Cancel" : "Batal"}
              </Button>
              <Button ref={generateConfirmActionRef} className="flex-1 gap-2" onClick={confirmGenerate} disabled={generatingSample}>
                <Wand2 className="w-4 h-4" />
                {resumeLang === "en" ? "Generate & Replace" : "Generate & Ganti"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSupportPrompt && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[overlay-in_.2s_ease-out]"
          onClick={() => setShowSupportPrompt(false)}
        >
          <div
            ref={supportPromptActionRef}
            tabIndex={-1}
            className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl p-6 text-center focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={resumeLang === "en" ? "Like the result?" : "Suka hasilnya?"}
          >
            <button
              onClick={() => setShowSupportPrompt(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Heart className="w-6 h-6" />
              </div>
            </div>
            <h3 className="font-bold text-lg">
              {resumeLang === "en" ? "Like the result?" : "Suka hasilnya?"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {resumeLang === "en"
                ? "LolosCV is free. A small donation keeps the servers running. Completely optional."
                : "LolosCV gratis. Donasi kecil membantu biaya server, sepenuhnya opsional."}
            </p>
            <div className="mt-5">
              <DonationCard compact lang={resumeLang === "en" ? "en" : "id"} onDone={() => setShowSupportPrompt(false)} />
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setShowSupportPrompt(false)}
              >
                {resumeLang === "en" ? "Maybe later" : "Nanti saja"}
              </Button>
              <button
                onClick={dismissDonationForever}
                className="mx-auto mt-2 block text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {resumeLang === "en" ? "Don't show this again" : "Jangan tampilkan lagi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlaceholderWarning && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[overlay-in_.2s_ease-out]"
          onClick={() => setShowPlaceholderWarning(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 animate-[modal-in_.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="CV kamu masih berisi data contoh"
          >
            <button
              onClick={() => setShowPlaceholderWarning(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">CV kamu masih berisi data contoh</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Nama perusahaan, email, atau foto di CV ini masih data demo. Rekruter langsung menolak CV dengan data contoh. Ganti dulu dengan data aslimu.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <Button
                ref={placeholderWarningActionRef}
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPlaceholderWarning(false)
                  placeholderSkipRef.current = false
                  if (preview) setPreview(false)
                  setTimeout(() => {
                    document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" })
                    const firstInput = document.querySelector<HTMLElement>("#builder input:not([type=file])")
                    firstInput?.focus()
                  }, 50)
                }}
              >
                Ganti Data Saya
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowPlaceholderWarning(false)
                  placeholderSkipRef.current = true
                  continuePrintFlow()
                }}
              >
                Tetap Cetak
              </Button>
            </div>
          </div>
        </div>
      )}

      {showWipeConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[overlay-in_.2s_ease-out]"
          onClick={() => setShowWipeConfirm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 animate-[modal-in_.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Hapus semua data CV dari browser ini?"
          >
            <button
              onClick={() => setShowWipeConfirm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Batal"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Hapus semua data CV dari browser ini?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Semua isi CV, pengaturan, dan konfigurasi API akan dihapus permanen dari penyimpanan browser ini. Kalau belum punya cadangan, simpan dulu datanya ke file.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <Button ref={wipeConfirmActionRef} variant="outline" className="flex-1" onClick={() => setShowWipeConfirm(false)}>
                Batal
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleWipeAllData}>
                Ya, Hapus Semua
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="container relative">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary text-white shadow-xl">
              <FileText className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Buat{" "}
            <span className="text-primary">
              CV Impian
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Isi data diri, pengalaman, dan skill. Hasilnya bisa langsung kamu lihat preview-nya.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24 lg:pb-0">
          <div className="lg:col-span-2 space-y-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pr-2 lg:pb-8">
            <h3 className="text-lg font-bold px-1">{preview ? "Preview CV" : "Edit CV"}</h3>
            {/* T8/T10b: chip autosave + progress pengisian. Posisi di atas form
                supaya terlihat di mobile sebelum user scroll jauh. */}
            <div className="flex flex-wrap items-center gap-2 px-1 print:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersimpan otomatis di browser ini
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {filledSections}/8 bagian terisi
              </span>
            </div>
            <div className="sticky top-16 z-30 -mx-1 px-2 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-xl border border-border/50 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={togglePreview} className="gap-2">
                  {preview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {preview ? "Edit" : "Preview"}
                </Button>
                <div className="flex items-center gap-1 rounded-lg border p-1 bg-background">
                  <button
                    onClick={() => handleToggleLanguage("id")}
                    disabled={translating || resumeLang === "id"}
                    title="Terjemahkan ke Bahasa Indonesia"
                    className={cn(
                      "px-3 py-2 min-h-[40px] rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                      resumeLang === "id" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {translating && resumeLang !== "id" && <Loader2 className="w-3 h-3 animate-spin" />}
                    ID
                  </button>
                  <button
                    onClick={() => handleToggleLanguage("en")}
                    disabled={translating || resumeLang === "en"}
                    title="Translate to English"
                    className={cn(
                      "px-3 py-2 min-h-[40px] rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                      resumeLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {translating && resumeLang !== "en" && <Loader2 className="w-3 h-3 animate-spin" />}
                    EN
                  </button>
                </div>
                <div className="w-px h-6 bg-border hidden sm:block" aria-hidden />
              <div className="relative flex items-center">
                <LayoutTemplate className="w-3.5 h-3.5 absolute left-2 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as ResumeTemplate)}
                  title={resumeLang === "en" ? "Template" : "Template"}
                  aria-label="Template"
                  className="text-xs font-medium border border-border rounded-lg pl-8 pr-7 py-2 min-h-[40px] bg-background hover:border-primary/50 focus:border-primary transition-colors cursor-pointer max-w-[150px] appearance-none"
                >
                  {(Object.entries(templateStyles) as [ResumeTemplate, TemplateStyle][]).map(([key, t]) => (
                    <option key={key} value={key}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative flex items-center">
                <Type className="w-3.5 h-3.5 absolute left-2 text-muted-foreground pointer-events-none" />
                <select
                  value={cvFont}
                  onChange={(e) => setCvFont(e.target.value as CvFont)}
                  title={resumeLang === "en" ? "Font" : "Font"}
                  aria-label="Font"
                  className="text-xs font-medium border border-border rounded-lg pl-8 pr-7 py-2 min-h-[40px] bg-background hover:border-primary/50 focus:border-primary transition-colors cursor-pointer max-w-[130px] appearance-none"
                >
                  {(Object.keys(FONT_STACKS) as CvFont[]).map((f) => (
                    <option key={f} value={f}>{resumeLang === "en" ? FONT_LABELS_EN[f] : FONT_LABELS_ID[f]}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative flex items-center">
                <ALargeSmall className="w-3.5 h-3.5 absolute left-2 text-muted-foreground pointer-events-none" />
                <select
                  value={cvSize}
                  onChange={(e) => setCvSize(e.target.value as CvFontSize)}
                  title={resumeLang === "en" ? "Size" : "Ukuran"}
                  aria-label="Size"
                  className="text-xs font-medium border border-border rounded-lg pl-8 pr-7 py-2 min-h-[40px] bg-background hover:border-primary/50 focus:border-primary transition-colors cursor-pointer appearance-none"
                >
                  {(Object.keys(FONT_SCALE) as CvFontSize[]).map((s) => (
                    <option key={s} value={s}>{resumeLang === "en" ? SIZE_LABELS_EN[s] : SIZE_LABELS_ID[s]}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-muted-foreground pointer-events-none" />
              </div>
              {(selectedTemplate === "creative" || selectedTemplate === "modern") && (
                <div className="flex items-center gap-1" title={resumeLang === "en" ? "Accent color" : "Warna aksen"}>
                  {ACCENT_PALETTES.map((p, i) => (
                    <button
                      key={p.name}
                      onClick={() => setAccentIdx(i)}
                      title={resumeLang === "en" ? p.name : p.nameId}
                      aria-label={resumeLang === "en" ? p.name : p.nameId}
                      className={cn(
                        "w-9 h-9 rounded-full border-2 transition-all",
                        accentIdx === i ? "ring-2 ring-offset-1 ring-primary border-transparent" : "border-border"
                      )}
                      style={{ backgroundColor: p.main }}
                    />
                  ))}
                </div>
              )}
            </div>
            </div>

            {showImportTools && (
              <Card className="border-border/50 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4 text-primary" />
                    Import CV / Resume
                  </CardTitle>
                  <CardDescription>
                    Upload file PDF CV-mu, data akan diekstrak dan diisi otomatis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CVUploader onApply={(data) => { setResume(data); setShowImportTools(false); showToast("Data CV berhasil diimport!") }} onClose={() => setShowImportTools(false)} />
                </CardContent>
              </Card>
            )}

            {!preview && isResumeEmpty && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary text-white shadow-lg shrink-0">
                      <Wand2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold">Mulai cepat: impor atau isi manual</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Sudah analisis lowongan di atas? Isi resume yang langsung cocok dengan lowongan itu dalam satu klik.
                        Punya CV lama? Impor PDF-nya, atau isi satu per satu.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button onClick={requestGenerate} disabled={generatingSample} className="gap-2">
                          {generatingSample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          {generatingSample ? "Membuat..." : "Generate Sample CV"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowImportTools(!showImportTools)} className="gap-2">
                          <Upload className="w-4 h-4" />
                          {showImportTools ? "Tutup Import CV" : "Import dari CV"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {preview ? (
              <Card className="border-border/50 print:border-0 print:shadow-none print:rounded-none">
                <CardContent
                  className="p-8 print:p-0 relative"
                  ref={previewRef}
                  id="resume-preview-content"
                  style={{ fontFamily: FONT_STACKS[cvFont] } as React.CSSProperties}
                >
                  {preview && contentH > A4_CONTENT_PX && (
                    <p className="text-center text-[10px] text-muted-foreground mb-2 print:hidden">
                      {compactOnePage
                        ? (resumeLang === "en"
                          ? `About ${estPages} pages, compacted to ${compactPct}% on download`
                          : `Sekitar ${estPages} halaman, dipadatkan menjadi ${compactPct}% saat diunduh`)
                        : (resumeLang === "en"
                          ? `About ${estPages} pages, downloaded as ${estPages} pages`
                          : `Sekitar ${estPages} halaman, terunduh ${estPages} halaman`)}
                    </p>
                  )}
                  {/* ATS CLASSIC - single column, black & white, bullet points */}
                  {selectedTemplate === "corporate" && (
                    <div className="mx-auto bg-white shadow-lg overflow-hidden print:shadow-none print:rounded-none cv-paper" style={{ maxWidth: "210mm", ["--cv-scale" as any]: FONT_SCALE[cvSize] } as React.CSSProperties}>
                      <div className="p-5 gap-3 flex flex-col">
                        <div className="text-center border-b border-gray-300 pb-2" style={{ order: -1 }}>
                          <p className="text-2xl font-bold tracking-tight text-gray-900">{resume.personalInfo.fullName || (resumeLang === "en" ? "Full Name" : "Nama Lengkap")}</p>
                          {resume.personalInfo.headline && (
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-700 mt-1">{resume.personalInfo.headline}</p>
                          )}
                          <p className="text-[10px] text-gray-600 mt-1">
                            {[resume.personalInfo.location, resume.personalInfo.phone && `P: ${resume.personalInfo.phone}`, resume.personalInfo.email].filter(Boolean).join(" | ")}
                          </p>
                          {[resume.personalInfo.linkedin, resume.personalInfo.portfolio].filter(Boolean).length > 0 && (
                            <p className="text-[9px] text-gray-500">
                              {[resume.personalInfo.linkedin, resume.personalInfo.portfolio].filter(Boolean).map((link, i, arr) => (
                                <span key={i}>
                                  <a href={asHref(link)} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">{link}</a>
                                  {i < arr.length - 1 ? " | " : ""}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                        {isSectionVisible("summary") && resume.summary && (
                          <div style={{ order: orderOf("summary") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("summary", resumeLang)}</h3>
                            <p className="text-[10px] leading-relaxed text-gray-800 text-justify">{resume.summary}</p>
                          </div>
                        )}
                        {isSectionVisible("experiences") && resume.experiences.length > 0 && (
                          <div style={{ order: orderOf("experiences") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("experiences", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.experiences.map((exp) => (
                                <div key={exp.id} className="print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-900">{exp.position}</p>
                                      <p className="text-[10px] italic text-gray-600">{exp.company}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      {exp.location && <p className="text-[9px] italic text-gray-500 leading-snug">{exp.location}</p>}
                                      <p className="text-[9px] italic text-gray-500 whitespace-nowrap">
                                        {formatResumeDate(exp.startDate)}{exp.startDate && " - "}{exp.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(exp.endDate)}
                                      </p>
                                    </div>
                                  </div>
                                  {exp.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {exp.description.split("\n").filter(Boolean).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("organizations") && (resume.organizations ?? []).length > 0 && (
                          <div style={{ order: orderOf("organizations") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("organizations", resumeLang)}</h3>
                            <div className="space-y-2">
                              {(resume.organizations ?? []).map((org) => (
                                <div key={org.id} className="print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-900">{org.position}</p>
                                      <p className="text-[10px] italic text-gray-600">{org.organization}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      {org.location && <p className="text-[9px] italic text-gray-500 leading-snug">{org.location}</p>}
                                      <p className="text-[9px] italic text-gray-500 whitespace-nowrap">
                                        {formatResumeDate(org.startDate)}{org.startDate && " - "}{org.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(org.endDate)}
                                      </p>
                                    </div>
                                  </div>
                                  {org.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(org.description).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("research") && (resume.research ?? []).length > 0 && (
                          <div className="print:break-inside-avoid" style={{ order: orderOf("research") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("research", resumeLang)}</h3>
                            <div className="space-y-2">
                              {(resume.research ?? []).map((rs) => (
                                <div key={rs.id} className="print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-900">
                                        {rs.title}
                                        {rs.status && <span className="font-normal italic text-gray-500"> | {rs.status}</span>}
                                      </p>
                                      {rs.organization && <p className="text-[10px] italic text-gray-600">{rs.organization}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                      {rs.location && <p className="text-[9px] italic text-gray-500 leading-snug">{rs.location}</p>}
                                      {(rs.startDate || rs.endDate || rs.current) && (
                                        <p className="text-[9px] italic text-gray-500 whitespace-nowrap">
                                          {formatResumeDate(rs.startDate)}{rs.startDate && " - "}{rs.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(rs.endDate)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {rs.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(rs.description).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed text-justify">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="print:break-inside-avoid">
                                  <p className="text-[11px] font-bold text-gray-900">
                                    {proj.name}
                                    {(proj.technologies ?? []).length > 0 && (
                                      <span className="font-normal text-gray-700"> | {(proj.technologies ?? []).join(", ")}</span>
                                    )}
                                    {proj.url && (
                                      <span className="font-normal"> | <a href={asHref(proj.url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{resumeLang === "en" ? "Portfolio Link" : "Link Portofolio"}</a></span>
                                    )}
                                  </p>
                                  {proj.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {String(proj.description).split("\n").filter(Boolean).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}

                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("education") && resume.education.length > 0 && (
                          <div style={{ order: orderOf("education") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("education", resumeLang)}</h3>
                            {resume.education.map((edu) => (
                              <div key={edu.id} className="mb-1 print:break-inside-avoid">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900">{edu.institution}</p>
                                    {eduMeta(edu, resumeLang) && <p className="text-[10px] italic text-gray-600">{eduMeta(edu, resumeLang)}</p>}
                                  </div>
                                  <p className="text-[9px] italic text-gray-500 shrink-0 ml-2 whitespace-nowrap">{formatResumeDate(edu.startDate)} - {formatResumeDate(edu.endDate)}</p>
                                </div>
                                {edu.thesisTitle && (
                                  <p className="text-[10px] text-gray-700 mt-0.5">
                                    <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                  </p>
                                )}
                                {edu.thesisDescription && (
                                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                    {bulletLines(edu.thesisDescription).map((line, i) => (
                                      <li key={i} className="text-[10px] text-gray-700 leading-relaxed text-justify">{line}</li>
                                    ))}
                                  </ul>
                                )}

                              </div>
                            ))}
                          </div>
                        )}
                        {isSectionVisible("skills") && getDisplaySkillGroups(resume).length > 0 && (
                          <div style={{ order: orderOf("skills") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("skills", resumeLang)}</h3>
                            <div className="space-y-1">
                              {getDisplaySkillGroups(resume).map((g) => (
                                <p key={g.id} className="text-[10px] text-gray-700 leading-relaxed">
                                  {g.title && <span className="font-semibold">{g.title}: </span>}
                                  {g.items.join(", ")}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {(getDisplayAwards(resume).length > 0 || (resume.certifications ?? []).length > 0) && isSectionVisible("awards") && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("awards", resumeLang)}</h3>
                            {getDisplayAwards(resume).length > 0 && (
                              <ul className="list-disc list-inside space-y-0.5">
                                {getDisplayAwards(resume).map((a) => (
                                  <li key={a.id} className="text-[10px] text-gray-700 leading-relaxed">
                                    <span className="font-semibold">{a.title}</span>
                                    {a.organizer && <span> | {a.organizer}</span>}
                                    {awardDate(a, resumeLang) && <span className="float-right italic text-gray-500 ml-2 whitespace-nowrap">{awardDate(a, resumeLang)}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {(resume.certifications ?? []).length > 0 && (
                              <p className="text-[10px] text-gray-700 leading-relaxed mt-1">
                                {(resume.certifications ?? []).join(" | ")}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {isSectionVisible("languages") && resume.languages.length > 0 && (
                          <div style={{ order: orderOf("languages") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("languages", resumeLang)}</h3>
                            <ul className="list-disc list-inside space-y-0.5">
                              {resume.languages.map((lang, i) => (
                                <li key={i} className="text-[10px] text-gray-700">{lang}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ATS + FOTO - single column, foto di kiri atas */}
                  {selectedTemplate === "professional" && (
                    <div className="mx-auto bg-white shadow-lg overflow-hidden print:shadow-none print:rounded-none cv-paper" style={{ maxWidth: "210mm", ["--cv-scale" as any]: FONT_SCALE[cvSize] } as React.CSSProperties}>
                      <div className="p-5 gap-3 flex flex-col">
                        <div className="flex items-center gap-5 border-b border-gray-300 pb-2" style={{ order: -1 }}>
                          {isSafePhotoSrc(resume.personalInfo.photo) ? (
                            <img src={resume.personalInfo.photo} alt={resume.personalInfo.fullName} className="w-[104px] h-[156px] object-cover border border-gray-400 shrink-0" />
                          ) : (
                            <div className="w-[104px] h-[156px] bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400 text-center shrink-0 print:hidden">Foto<br />2x3</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[27px] leading-tight font-bold tracking-tight text-gray-900">{resume.personalInfo.fullName || (resumeLang === "en" ? "Full Name" : "Nama Lengkap")}</p>
                            {resume.personalInfo.headline && (
                              <p className="text-[13px] font-semibold text-gray-800 mt-1">{resume.personalInfo.headline}</p>
                            )}
                            <p className="text-[11px] text-gray-600 mt-1.5">
                              {[resume.personalInfo.location, resume.personalInfo.phone && `P: ${resume.personalInfo.phone}`, resume.personalInfo.email].filter(Boolean).join(" | ")}
                            </p>
                            {[resume.personalInfo.linkedin, resume.personalInfo.portfolio].filter(Boolean).length > 0 && (
                              <p className="text-[10px] text-gray-500 mt-1">
                                {[resume.personalInfo.linkedin, resume.personalInfo.portfolio].filter(Boolean).map((link, i, arr) => (
                                  <span key={i}>
                                    <a href={asHref(link)} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">{link}</a>
                                    {i < arr.length - 1 ? " | " : ""}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        </div>
                        {isSectionVisible("summary") && resume.summary && (
                          <div style={{ order: orderOf("summary") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("summary", resumeLang)}</h3>
                            <p className="text-[10px] leading-relaxed text-gray-800 text-justify">{resume.summary}</p>
                          </div>
                        )}
                        {isSectionVisible("experiences") && resume.experiences.length > 0 && (
                          <div style={{ order: orderOf("experiences") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("experiences", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.experiences.map((exp) => (
                                <div key={exp.id} className="print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-900">{exp.position}</p>
                                      <p className="text-[10px] italic text-gray-600">{exp.company}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      {exp.location && <p className="text-[9px] italic text-gray-500 leading-snug">{exp.location}</p>}
                                      <p className="text-[9px] italic text-gray-500 whitespace-nowrap">
                                        {formatResumeDate(exp.startDate)}{exp.startDate && " - "}{exp.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(exp.endDate)}
                                      </p>
                                    </div>
                                  </div>
                                  {exp.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {exp.description.split("\n").filter(Boolean).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("organizations") && (resume.organizations ?? []).length > 0 && (
                          <div style={{ order: orderOf("organizations") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("organizations", resumeLang)}</h3>
                            <div className="space-y-2">
                              {(resume.organizations ?? []).map((org) => (
                                <div key={org.id} className="print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-900">{org.position}</p>
                                      <p className="text-[10px] italic text-gray-600">{org.organization}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      {org.location && <p className="text-[9px] italic text-gray-500 leading-snug">{org.location}</p>}
                                      <p className="text-[9px] italic text-gray-500 whitespace-nowrap">
                                        {formatResumeDate(org.startDate)}{org.startDate && " - "}{org.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(org.endDate)}
                                      </p>
                                    </div>
                                  </div>
                                  {org.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(org.description).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("research") && (resume.research ?? []).length > 0 && (
                          <div className="print:break-inside-avoid" style={{ order: orderOf("research") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("research", resumeLang)}</h3>
                            <div className="space-y-2">
                              {(resume.research ?? []).map((rs) => (
                                <div key={rs.id} className="print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-900">
                                        {rs.title}
                                        {rs.status && <span className="font-normal italic text-gray-500"> | {rs.status}</span>}
                                      </p>
                                      {rs.organization && <p className="text-[10px] italic text-gray-600">{rs.organization}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                      {rs.location && <p className="text-[9px] italic text-gray-500 leading-snug">{rs.location}</p>}
                                      {(rs.startDate || rs.endDate || rs.current) && (
                                        <p className="text-[9px] italic text-gray-500 whitespace-nowrap">
                                          {formatResumeDate(rs.startDate)}{rs.startDate && " - "}{rs.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(rs.endDate)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {rs.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(rs.description).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed text-justify">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="print:break-inside-avoid">
                                  <p className="text-[11px] font-bold text-gray-900">
                                    {proj.name}
                                    {(proj.technologies ?? []).length > 0 && (
                                      <span className="font-normal text-gray-700"> | {(proj.technologies ?? []).join(", ")}</span>
                                    )}
                                    {proj.url && (
                                      <span className="font-normal"> | <a href={asHref(proj.url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{resumeLang === "en" ? "Portfolio Link" : "Link Portofolio"}</a></span>
                                    )}
                                  </p>
                                  {proj.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {String(proj.description).split("\n").filter(Boolean).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}

                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("education") && resume.education.length > 0 && (
                          <div style={{ order: orderOf("education") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("education", resumeLang)}</h3>
                            {resume.education.map((edu) => (
                              <div key={edu.id} className="mb-1 print:break-inside-avoid">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900">{edu.institution}</p>
                                    {eduMeta(edu, resumeLang) && <p className="text-[10px] italic text-gray-600">{eduMeta(edu, resumeLang)}</p>}
                                  </div>
                                  <p className="text-[9px] italic text-gray-500 shrink-0 ml-2 whitespace-nowrap">{formatResumeDate(edu.startDate)} - {formatResumeDate(edu.endDate)}</p>
                                </div>
                                {edu.thesisTitle && (
                                  <p className="text-[10px] text-gray-700 mt-0.5">
                                    <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                  </p>
                                )}
                                {edu.thesisDescription && (
                                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                    {bulletLines(edu.thesisDescription).map((line, i) => (
                                      <li key={i} className="text-[10px] text-gray-700 leading-relaxed text-justify">{line}</li>
                                    ))}
                                  </ul>
                                )}

                              </div>
                            ))}
                          </div>
                        )}
                        {isSectionVisible("skills") && getDisplaySkillGroups(resume).length > 0 && (
                          <div style={{ order: orderOf("skills") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("skills", resumeLang)}</h3>
                            <div className="space-y-1">
                              {getDisplaySkillGroups(resume).map((g) => (
                                <p key={g.id} className="text-[10px] text-gray-700 leading-relaxed">
                                  {g.title && <span className="font-semibold">{g.title}: </span>}
                                  {g.items.join(", ")}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {(getDisplayAwards(resume).length > 0 || (resume.certifications ?? []).length > 0) && isSectionVisible("awards") && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("awards", resumeLang)}</h3>
                            {getDisplayAwards(resume).length > 0 && (
                              <ul className="list-disc list-inside space-y-0.5">
                                {getDisplayAwards(resume).map((a) => (
                                  <li key={a.id} className="text-[10px] text-gray-700 leading-relaxed">
                                    <span className="font-semibold">{a.title}</span>
                                    {a.organizer && <span> | {a.organizer}</span>}
                                    {awardDate(a, resumeLang) && <span className="float-right italic text-gray-500 ml-2 whitespace-nowrap">{awardDate(a, resumeLang)}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {(resume.certifications ?? []).length > 0 && (
                              <p className="text-[10px] text-gray-700 leading-relaxed mt-1">
                                {(resume.certifications ?? []).join(" | ")}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {isSectionVisible("languages") && resume.languages.length > 0 && (
                          <div style={{ order: orderOf("languages") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("languages", resumeLang)}</h3>
                            <ul className="list-disc list-inside space-y-0.5">
                              {resume.languages.map((lang, i) => (
                                <li key={i} className="text-[10px] text-gray-700">{lang}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ATS + FOTO - single column, foto di kiri atas */}
                  {selectedTemplate === "creative" && (
                    <div className={cn("mx-auto bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none print:rounded-none cv-paper")} style={{ maxWidth: "210mm", ["--cv-scale" as any]: FONT_SCALE[cvSize] } as React.CSSProperties}>
                      <div className="px-5 py-4 text-white text-center" style={{ backgroundColor: pal.main, order: -1 }}>
                        <p className="text-2xl font-bold">{resume.personalInfo.fullName || (resumeLang === "en" ? "Full Name" : "Nama Lengkap")}</p>
                        {resume.personalInfo.headline && (
                          <p className="text-sm font-semibold mt-1 opacity-95">{resume.personalInfo.headline}</p>
                        )}
                        <p className="text-xs mt-1 opacity-80">{resume.personalInfo.location}</p>
                        <p className="text-[10px] mt-1 opacity-70">
                          {[resume.personalInfo.email, resume.personalInfo.phone].filter(Boolean).join(" | ")}
                        </p>
                      </div>
                      <div className="p-5 gap-3 flex flex-col">
                        {isSectionVisible("summary") && resume.summary && (
                          <div className="p-4 rounded-xl" style={{ backgroundColor: pal.soft, order: orderOf("summary") }}>
                            <p className="text-xs leading-relaxed text-justify">{resume.summary}</p>
                          </div>
                        )}
                        {isSectionVisible("experiences") && resume.experiences.length > 0 && (
                          <div style={{ order: orderOf("experiences") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("experiences", resumeLang)}</h3>
                            <div className="space-y-2 mt-2">
                              {resume.experiences.map((exp) => (
                                <div key={exp.id} className="p-2.5 rounded-xl border print:break-inside-avoid" style={{ borderColor: pal.main, backgroundColor: pal.soft }}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-bold">{exp.position}</p>
                                      <p className="text-[11px] text-muted-foreground">{exp.company}</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(exp.startDate)} - {exp.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(exp.endDate)}</p>
                                  </div>
                                  {exp.description && (
                                    <ul className="list-disc list-inside mt-1.5 space-y-0.5">
                                      {bulletLines(exp.description).map((line, i) => (
                                        <li key={i} className="text-[11px] leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("organizations") && (resume.organizations ?? []).length > 0 && (
                          <div style={{ order: orderOf("organizations") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("organizations", resumeLang)}</h3>
                            <div className="space-y-2 mt-2">
                              {(resume.organizations ?? []).map((org) => (
                                <div key={org.id} className="p-2.5 rounded-xl border print:break-inside-avoid" style={{ borderColor: pal.main, backgroundColor: pal.soft }}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-bold">{org.position}</p>
                                      <p className="text-[11px] text-muted-foreground">{org.organization}</p>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(org.startDate)} - {org.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(org.endDate)}</p>
                                  </div>
                                  {org.description && (
                                    <ul className="list-disc list-inside mt-1.5 space-y-0.5">
                                      {bulletLines(org.description).map((line, i) => (
                                        <li key={i} className="text-[11px] leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("education") && resume.education.length > 0 && (
                          <div style={{ order: orderOf("education") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("education", resumeLang)}</h3>
                            <div className="space-y-2 mt-3">
                              {resume.education.map((edu) => (
                                <div key={edu.id} className="p-3 rounded-xl border border-border print:break-inside-avoid">
                                  <p className="text-sm font-bold">{edu.institution}</p>
                                  {eduMeta(edu, resumeLang) && <p className="text-[11px] text-muted-foreground">{eduMeta(edu, resumeLang)}</p>}
                                  {edu.thesisTitle && (
                                    <p className="text-[11px] mt-1">
                                      <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                    </p>
                                  )}
                                  {edu.thesisDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.thesisDescription).map((line, i) => (
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed text-justify">{line}</li>
                                      ))}
                                    </ul>
                                  )}

                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("research") && (resume.research ?? []).length > 0 && (
                          <div style={{ order: orderOf("research") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("research", resumeLang)}</h3>
                            <div className="space-y-2 mt-2">
                              {(resume.research ?? []).map((rs) => (
                                <div key={rs.id} className="p-2.5 rounded-xl border print:break-inside-avoid" style={{ borderColor: pal.main, backgroundColor: pal.soft }}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-bold">
                                        {rs.title}
                                        {rs.status && <span className="font-medium text-[11px] text-muted-foreground"> | {rs.status}</span>}
                                      </p>
                                      {rs.organization && <p className="text-[11px] text-muted-foreground">{rs.organization}</p>}
                                    </div>
                                    {(rs.startDate || rs.endDate || rs.current) && (
                                      <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(rs.startDate)} - {rs.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(rs.endDate)}</p>
                                    )}
                                  </div>
                                  {rs.description && (
                                    <ul className="list-disc list-inside mt-1.5 space-y-0.5">
                                      {bulletLines(rs.description).map((line, i) => (
                                        <li key={i} className="text-[11px] leading-relaxed text-justify">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2 mt-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="p-2.5 rounded-xl border print:break-inside-avoid" style={{ borderColor: pal.main, backgroundColor: pal.soft }}>
                                  <p className="text-sm font-bold">
                                    {proj.name}
                                    {(proj.technologies ?? []).length > 0 && (
                                      <span className="font-medium text-[11px]" style={{ color: pal.main }}> | {(proj.technologies ?? []).join(", ")}</span>
                                    )}
                                    {proj.url && (
                                      <span className="text-[11px] font-medium"> | <a
                                        href={asHref(proj.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline underline-offset-2"
                                        style={{ color: pal.main }}
                                      >{resumeLang === "en" ? "Portfolio Link" : "Link Portofolio"}</a></span>
                                    )}
                                  </p>
                                  {proj.description && (
                                    <ul className="list-disc list-inside mt-1.5 space-y-0.5">
                                      {String(proj.description).split("\n").filter(Boolean).map((line, i) => (
                                        <li key={i} className="text-[11px] leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}

                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("skills") && getDisplaySkillGroups(resume).length > 0 && (
                          <div style={{ order: orderOf("skills") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("skills", resumeLang)}</h3>
                            <div className="space-y-2 mt-2">
                              {getDisplaySkillGroups(resume).map((g) => (
                                <div key={g.id}>
                                  {g.title && <p className="text-[11px] font-bold mb-1.5">{g.title}</p>}
                                  <div className="flex flex-wrap gap-2">
                                    {g.items.map((item, i) => (
                                      <span key={i} className="text-[11px] px-3 py-1 rounded-full font-medium border" style={{ borderColor: pal.main, backgroundColor: pal.soft }}>{item}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(getDisplayAwards(resume).length > 0 || (resume.certifications ?? []).length > 0) && isSectionVisible("awards") && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("awards", resumeLang)}</h3>
                            {getDisplayAwards(resume).length > 0 && (
                              <ul className="list-disc list-inside mt-3 space-y-1">
                                {getDisplayAwards(resume).map((a) => (
                                  <li key={a.id} className="text-[11px] leading-relaxed">
                                    <span className="font-semibold">{a.title}</span>
                                    {a.organizer && <span> | {a.organizer}</span>}
                                    {awardDate(a, resumeLang) && <span className="italic opacity-70"> ({awardDate(a, resumeLang)})</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {(resume.certifications ?? []).length > 0 && (
                              <p className="text-[11px] mt-2">
                                {(resume.certifications ?? []).join(" | ")}
                              </p>
                            )}
                          </div>
                        )}
                        {isSectionVisible("languages") && resume.languages.length > 0 && (
                          <div style={{ order: orderOf("languages") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("languages", resumeLang)}</h3>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {resume.languages.map((lang, i) => (
                                <span key={i} className="text-[11px] px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300">{lang}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

{selectedTemplate === "modern" && (
                    <div className={cn("mx-auto bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none print:rounded-none cv-paper")} style={{ maxWidth: "210mm", ["--cv-scale" as any]: FONT_SCALE[cvSize] } as React.CSSProperties}>
                      <div className="px-5 pt-4 pb-2 border-b-2" style={{ borderBottomColor: pal.main, order: -1 }}>
                        <p className="text-2xl font-light tracking-tight">{resume.personalInfo.fullName || (resumeLang === "en" ? "Full Name" : "Nama Lengkap")}</p>
                        {resume.personalInfo.headline && (
                          <p className="text-[12px] font-semibold tracking-wide mt-1" style={{ color: pal.main }}>{resume.personalInfo.headline}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground mt-2">
                          {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                          {resume.personalInfo.phone && <span>{resume.personalInfo.phone}</span>}
                          {resume.personalInfo.location && <span>{resume.personalInfo.location}</span>}
                          {resume.personalInfo.linkedin && (
                            <a href={asHref(resume.personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">{resume.personalInfo.linkedin}</a>
                          )}
                          {resume.personalInfo.portfolio && (
                            <a href={asHref(resume.personalInfo.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">{resume.personalInfo.portfolio}</a>
                          )}
                        </div>
                      </div>
                      <div className="p-5 gap-3 flex flex-col">
                        {isSectionVisible("summary") && resume.summary && (
                          <div style={{ order: orderOf("summary") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{resumeLang === "en" ? "ABOUT ME" : "TENTANG SAYA"}</h3>
                            <p className="text-[11px] leading-relaxed text-justify">{resume.summary}</p>
                          </div>
                        )}
                        {isSectionVisible("experiences") && resume.experiences.length > 0 && (
                          <div style={{ order: orderOf("experiences") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: pal.main }}>{getSectionLabel("experiences", resumeLang)}</h3>
                            <div className="space-y-0 relative">
                              <div className="absolute left-[7px] top-2 bottom-2 w-0.5" style={{ backgroundColor: pal.soft }} />
                              {resume.experiences.map((exp) => (
                                <div key={exp.id} className="flex gap-4 pb-3 relative print:break-inside-avoid">
                                  <div className="w-4 shrink-0 flex justify-center pt-0.5">
                                    <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: pal.main }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-sm font-semibold">{exp.position}</p>
                                        <p className="text-[11px] text-muted-foreground">{exp.company}</p>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(exp.startDate)} - {exp.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(exp.endDate)}</p>
                                    </div>
                                    {exp.description && <p className="text-[11px] mt-1 leading-relaxed">{exp.description}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("education") && resume.education.length > 0 && (
                          <div style={{ order: orderOf("education") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("education", resumeLang)}</h3>
                            <div className="space-y-1.5">
                              {resume.education.map((edu) => (
                                <div key={edu.id} className="border-b border-gray-100 pb-1.5 print:break-inside-avoid">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold">{edu.institution}</p>
                                      {eduMeta(edu, resumeLang) && <p className="text-[11px] text-muted-foreground">{eduMeta(edu, resumeLang)}</p>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(edu.startDate)} - {formatResumeDate(edu.endDate)}</p>
                                  </div>
                                  {edu.thesisTitle && (
                                    <p className="text-[11px] mt-1">
                                      <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                    </p>
                                  )}
                                  {edu.thesisDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.thesisDescription).map((line, i) => (
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed text-justify">{line}</li>
                                      ))}
                                    </ul>
                                  )}

                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("skills") && getDisplaySkillGroups(resume).length > 0 && (
                          <div style={{ order: orderOf("skills") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("skills", resumeLang)}</h3>
                            <div className="space-y-2">
                              {getDisplaySkillGroups(resume).map((g) => (
                                <div key={g.id}>
                                  {g.title && <p className="text-[11px] font-bold mb-1">{g.title}</p>}
                                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {g.items.map((item, i) => (
                                      <span key={i} className="text-[11px] flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: pal.main }} />
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(getDisplayAwards(resume).length > 0 || (resume.certifications ?? []).length > 0) && isSectionVisible("awards") && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("awards", resumeLang)}</h3>
                            {getDisplayAwards(resume).length > 0 && (
                              <div className="flex flex-col gap-y-1">
                                {getDisplayAwards(resume).map((a) => (
                                  <div key={a.id} className="flex justify-between items-start gap-2">
                                    <span className="text-[11px] flex items-start gap-1 min-w-0">
                                      <span className="w-1 h-1 rounded-full inline-block shrink-0 mt-1.5" style={{ backgroundColor: pal.main }} />
                                      <span><span className="font-semibold">{a.title}</span>{a.organizer && <span className="text-muted-foreground"> | {a.organizer}</span>}</span>
                                    </span>
                                    {awardDate(a, resumeLang) && <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{awardDate(a, resumeLang)}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {(resume.certifications ?? []).length > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                {(resume.certifications ?? []).join(" | ")}
                              </p>
                            )}
                          </div>
                        )}
                        {isSectionVisible("organizations") && (resume.organizations ?? []).length > 0 && (
                          <div style={{ order: orderOf("organizations") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: pal.main }}>{getSectionLabel("organizations", resumeLang)}</h3>
                            <div className="space-y-0 relative">
                              <div className="absolute left-[7px] top-2 bottom-2 w-0.5" style={{ backgroundColor: pal.soft }} />
                              {(resume.organizations ?? []).map((org) => (
                                <div key={org.id} className="flex gap-4 pb-3 relative print:break-inside-avoid">
                                  <div className="w-4 shrink-0 flex justify-center pt-0.5">
                                    <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: pal.main }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-sm font-semibold">{org.position}</p>
                                        <p className="text-[11px] text-muted-foreground">{org.organization}</p>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(org.startDate)} - {org.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(org.endDate)}</p>
                                    </div>
                                    {org.description && (
                                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        {bulletLines(org.description).map((line, i) => (
                                          <li key={i} className="text-[11px] leading-relaxed">{line}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("research") && (resume.research ?? []).length > 0 && (
                          <div style={{ order: orderOf("research") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("research", resumeLang)}</h3>
                            <div className="space-y-0 relative">
                              <div className="absolute left-[7px] top-2 bottom-2 w-0.5" style={{ backgroundColor: pal.soft }} />
                              {(resume.research ?? []).map((rs) => (
                                <div key={rs.id} className="flex gap-4 pb-3 relative print:break-inside-avoid">
                                  <div className="w-4 shrink-0 flex justify-center pt-0.5">
                                    <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: pal.main }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="text-sm font-semibold">
                                        {rs.title}
                                        {rs.status && <span className="font-normal text-[11px] text-muted-foreground"> | {rs.status}</span>}
                                      </p>
                                        {rs.organization && <p className="text-[11px] text-muted-foreground">{rs.organization}</p>}
                                      </div>
                                      {(rs.startDate || rs.endDate || rs.current) && (
                                        <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(rs.startDate)} - {rs.current ? (resumeLang === "en" ? "Present" : "Sekarang") : formatResumeDate(rs.endDate)}</p>
                                      )}
                                    </div>
                                    {rs.description && (
                                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        {bulletLines(rs.description).map((line, i) => (
                                          <li key={i} className="text-[11px] leading-relaxed text-justify">{line}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="print:break-inside-avoid">
                                  <p className="text-sm font-semibold">
                                    {proj.name}
                                    {(proj.technologies ?? []).length > 0 && (
                                      <span className="font-normal text-[11px] text-muted-foreground"> | {(proj.technologies ?? []).join(", ")}</span>
                                    )}
                                    {proj.url && (
                                      <span className="font-normal text-[11px]"> | <a href={asHref(proj.url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-muted-foreground">{resumeLang === "en" ? "Portfolio Link" : "Link Portofolio"}</a></span>
                                    )}
                                  </p>
                                  {proj.description && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {String(proj.description).split("\n").filter(Boolean).map((line, i) => (
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}

                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {isSectionVisible("languages") && resume.languages.length > 0 && (
                          <div style={{ order: orderOf("languages") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("languages", resumeLang)}</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {resume.languages.map((lang, i) => (
                                <span key={i} className="text-[11px] flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: pal.main }} />
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <SectionCard open={isSectionCardOpen("personal")} onOpenChange={(o) => setSectionCardOpen("personal", o)} title={resumeLang === "en" ? "Personal Information" : "Data Pribadi"} icon={User} color="bg-blue-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "fullName", label: (resumeLang === "en" ? "Full Name" : "Nama Lengkap"), placeholder: "John Doe" },
                      { key: "email", label: "Email", placeholder: "john@email.com", type: "email" },
                      { key: "phone", label: resumeLang === "en" ? "Phone" : "No. Telepon", placeholder: "+62 812-3456-7890" },
                      { key: "location", label: resumeLang === "en" ? "Location" : "Lokasi", placeholder: "Jakarta, Indonesia" },
                      { key: "linkedin", label: "LinkedIn URL", placeholder: "linkedin.com/in/johndoe" },
                      { key: "portfolio", label: "Portfolio/GitHub", placeholder: "github.com/johndoe" },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`pi-${key}`}>{label}</Label>
                        <Input
                          id={`pi-${key}`}
                          placeholder={placeholder}
                          type={type || "text"}
                          value={(resume.personalInfo as any)[key]}
                          onChange={(e) => updatePersonalInfo(key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pi-headline">Headline / Tagline</Label>
                      <Input
                        id="pi-headline"
                        placeholder="cth: Machine Learning Engineer"
                        value={resume.personalInfo.headline ?? ""}
                        onChange={(e) => updatePersonalInfo("headline", e.target.value)}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard open={isSectionCardOpen("photo", false)} onOpenChange={(o) => setSectionCardOpen("photo", o)} title={resumeLang === "en" ? "Profile Photo (optional)" : "Foto Profil (opsional)"} icon={User} color="bg-cyan-500">
                  <div className="flex items-center gap-4">
                    {isSafePhotoSrc(resume.personalInfo.photo) ? (
                      <img src={resume.personalInfo.photo} alt="Preview foto" className="w-[72px] h-[108px] object-cover border" />
                    ) : (
                      <div className="w-[72px] h-[108px] bg-muted border border-dashed flex items-center justify-center text-[9px] text-muted-foreground text-center">Foto<br />2x3</div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="text-xs"
                        aria-label={resumeLang === "en" ? "Upload profile photo" : "Unggah foto profil"}
                        onChange={handlePhotoUpload}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Format JPG/PNG/WebP. Foto besar otomatis dikompres (sisi maks 800px, target di bawah 300KB) supaya hemat penyimpanan.
                        Rasio pas foto 2:3 (lebar:tinggi), ukuran ideal 240x360px. Foto dipakai di template ATS + Foto, tampil sebagai kotak pas foto.
                      </p>
                      {resume.personalInfo.photo && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 h-auto p-0" onClick={() => updatePersonalInfo("photo", undefined)}>
                          Hapus foto
                        </Button>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {sectionOrder.map((sid) => {
                  if (sid === "summary") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={Globe} color="bg-violet-500">
                      <div className="space-y-3">
                        <textarea
                          onInput={autoGrowTextarea}
                          aria-label={resumeLang === "en" ? "Professional summary" : "Ringkasan profesional"}
                          className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-4 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                          placeholder={resumeLang === "en" ? "Write your professional summary... Or ask AI to help" : "Tulis ringkasan profesionalmu... Atau minta bantuan menulis"}
                          value={resume.summary}
                          onChange={(e) => setResume((prev) => ({ ...prev, summary: e.target.value }))}
                        />
                        <Button
                          variant="outline" size="sm" className="gap-2"
                          onClick={() => handleAiGenerate("summary")}
                          disabled={aiLoading === "summary"}
                        >
                          {aiLoading === "summary" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {resumeLang === "en" ? "Generate" : "Tuliskan"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "experiences") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={Briefcase} color="bg-emerald-500">
                      <div className="space-y-4">
                        {resume.experiences.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No experience yet. Click below to add." : "Belum ada pengalaman. Klik tombol di bawah untuk menambah."}
                          </p>
                        )}
                        {resume.experiences.map((exp, i) => (
                          <Card key={exp.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`exp-${i}-company`}>{resumeLang === "en" ? "Company" : "Perusahaan"}</Label>
                                  <Input id={`exp-${i}-company`} value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder={resumeLang === "en" ? "Company name" : "Nama perusahaan"} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`exp-${i}-position`}>{resumeLang === "en" ? "Position" : "Posisi"}</Label>
                                  <Input id={`exp-${i}-position`} value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} placeholder={resumeLang === "en" ? "Job title" : "Jabatan"} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`exp-${i}-location`}>{resumeLang === "en" ? "Location" : "Lokasi"}</Label>
                                  <Input id={`exp-${i}-location`} value={exp.location} onChange={(e) => updateExperience(exp.id, "location", e.target.value)} placeholder="Jakarta, Indonesia" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`exp-${i}-startDate`}>{resumeLang === "en" ? "Start Date" : "Tanggal Mulai"}</Label>
                                  <Input id={`exp-${i}-startDate`} type="month" value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`exp-${i}-endDate`}>{resumeLang === "en" ? "End Date" : "Tanggal Selesai"}</Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      id={`exp-${i}-endDate`}
                                      type="month" value={exp.endDate}
                                      onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                                      disabled={exp.current}
                                      className={exp.current ? "opacity-50" : ""}
                                    />
                                    <Label htmlFor={`exp-${i}-current`} className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                                      <input
                                        id={`exp-${i}-current`}
                                        type="checkbox"
                                        checked={exp.current}
                                        onChange={(e) => updateExperience(exp.id, "current", e.target.checked)}
                                        className="rounded"
                                      />
                                      {resumeLang === "en" ? "Current" : "Saat ini"}
                                    </Label>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2 mt-4">
                                <Label htmlFor={`exp-${i}-description`}>{resumeLang === "en" ? "Job Description" : "Deskripsi Pekerjaan"}</Label>
                                <textarea
                                  id={`exp-${i}-description`}
                                  onInput={autoGrowTextarea}
                                  className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                  placeholder={resumeLang === "en" ? "Describe responsibilities and achievements..." : "Jelaskan tanggung jawab dan pencapaianmu..."}
                                  value={exp.description}
                                  onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                                />
                                <Button
                                  variant="ghost" size="sm" className="gap-1 text-xs"
                                  onClick={() => handleAiGenerate("experience")}
                                  disabled={aiLoading === "experience"}
                                >
                                  {aiLoading === "experience" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                  {resumeLang === "en" ? "Optimize" : "Optimasi"}
                                </Button>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <ItemMoveButtons onUp={() => moveExperience(i, -1)} onDown={() => moveExperience(i, 1)} upDisabled={i === 0} downDisabled={i === resume.experiences.length - 1} label={resumeLang === "en" ? "Experience" : "Pengalaman"} />
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeExperience(exp.id)}>
                                  <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" className="w-full gap-2" onClick={addExperience}>
                          <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Experience" : "Tambah Pengalaman"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "organizations") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={Users} color="bg-teal-500">
                      <div className="space-y-4">
                        {(resume.organizations ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No organizational experience yet. Click below to add." : "Belum ada pengalaman organisasi. Klik tombol di bawah untuk menambah."}
                          </p>
                        )}
                        {(resume.organizations ?? []).map((org, i) => (
                          <Card key={org.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`org-${i}-organization`}>{resumeLang === "en" ? "Organization" : "Organisasi"}</Label>
                                  <Input id={`org-${i}-organization`} value={org.organization} onChange={(e) => updateOrganization(org.id, "organization", e.target.value)} placeholder={resumeLang === "en" ? "Organization name" : "Nama organisasi"} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`org-${i}-position`}>{resumeLang === "en" ? "Position / Role" : "Posisi / Jabatan"}</Label>
                                  <Input id={`org-${i}-position`} value={org.position} onChange={(e) => updateOrganization(org.id, "position", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Coordinator" : "cth. Koordinator"} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`org-${i}-location`}>{resumeLang === "en" ? "Location" : "Lokasi"}</Label>
                                  <Input id={`org-${i}-location`} value={org.location} onChange={(e) => updateOrganization(org.id, "location", e.target.value)} placeholder="Jakarta, Indonesia" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`org-${i}-startDate`}>{resumeLang === "en" ? "Start Date" : "Tanggal Mulai"}</Label>
                                  <Input id={`org-${i}-startDate`} type="month" value={org.startDate} onChange={(e) => updateOrganization(org.id, "startDate", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`org-${i}-endDate`}>{resumeLang === "en" ? "End Date" : "Tanggal Selesai"}</Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      id={`org-${i}-endDate`}
                                      type="month" value={org.endDate}
                                      onChange={(e) => updateOrganization(org.id, "endDate", e.target.value)}
                                      disabled={org.current}
                                      className={org.current ? "opacity-50" : ""}
                                    />
                                    <Label htmlFor={`org-${i}-current`} className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                                      <input
                                        id={`org-${i}-current`}
                                        type="checkbox"
                                        checked={org.current}
                                        onChange={(e) => updateOrganization(org.id, "current", e.target.checked)}
                                        className="rounded"
                                      />
                                      {resumeLang === "en" ? "Current" : "Saat ini"}
                                    </Label>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2 mt-4">
                                <Label htmlFor={`org-${i}-description`}>{resumeLang === "en" ? "Description (one bullet per line)" : "Deskripsi (satu bullet per baris)"}</Label>
                                <textarea
                                  id={`org-${i}-description`}
                                  onInput={autoGrowTextarea}
                                  className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                  placeholder={resumeLang === "en" ? "What you did, one achievement per line..." : "Apa yang dikerjakan, satu pencapaian per baris..."}
                                  value={org.description}
                                  onChange={(e) => updateOrganization(org.id, "description", e.target.value)}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <ItemMoveButtons onUp={() => moveOrganization(i, -1)} onDown={() => moveOrganization(i, 1)} upDisabled={i === 0} downDisabled={i === (resume.organizations ?? []).length - 1} label={resumeLang === "en" ? "Organization" : "Organisasi"} />
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeOrganization(org.id)}>
                                  <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" className="w-full gap-2" onClick={addOrganization}>
                          <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Organization" : "Tambah Organisasi"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "research") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={FlaskConical} color="bg-cyan-600">
                      <div className="space-y-4">
                        {(resume.research ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No research yet. Add each research separately." : "Belum ada riset. Tambahkan tiap riset satu per satu."}
                          </p>
                        )}
                        {(resume.research ?? []).map((rs, i) => (
                          <Card key={rs.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`rs-${i}-title`}>{resumeLang === "en" ? "Research Title" : "Judul Riset"}</Label>
                                  <Input id={`rs-${i}-title`} value={rs.title} onChange={(e) => updateResearch(rs.id, "title", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Hate Speech Detection in Indonesian Tweets" : "cth. Deteksi Ujaran Kebencian di Tweet Indonesia"} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`rs-${i}-status`}>{resumeLang === "en" ? "Paper Status (optional)" : "Status Paper (opsional)"}</Label>
                                  <Input id={`rs-${i}-status`} value={rs.status ?? ""} onChange={(e) => updateResearch(rs.id, "status", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Under Review, Published, Awaiting Publication" : "cth. Under Review, Published, Awaiting Publication"} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`rs-${i}-organization`}>{resumeLang === "en" ? "Lab / Institution" : "Lab / Institusi"}</Label>
                                    <Input id={`rs-${i}-organization`} value={rs.organization} onChange={(e) => updateResearch(rs.id, "organization", e.target.value)} placeholder={resumeLang === "en" ? "e.g. AI Lab" : "cth. Lab AI"} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`rs-${i}-location`}>{resumeLang === "en" ? "Location" : "Lokasi"}</Label>
                                    <Input id={`rs-${i}-location`} value={rs.location} onChange={(e) => updateResearch(rs.id, "location", e.target.value)} placeholder="Jakarta, Indonesia" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`rs-${i}-startDate`}>{resumeLang === "en" ? "Start Date" : "Tanggal Mulai"}</Label>
                                    <Input id={`rs-${i}-startDate`} type="month" value={rs.startDate} onChange={(e) => updateResearch(rs.id, "startDate", e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`rs-${i}-endDate`}>{resumeLang === "en" ? "End Date" : "Tanggal Selesai"}</Label>
                                    <div className="flex items-center gap-3">
                                      <Input
                                        id={`rs-${i}-endDate`}
                                        type="month" value={rs.endDate}
                                        onChange={(e) => updateResearch(rs.id, "endDate", e.target.value)}
                                        disabled={rs.current}
                                        className={rs.current ? "opacity-50" : ""}
                                      />
                                      <Label htmlFor={`rs-${i}-current`} className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                                        <input
                                          id={`rs-${i}-current`}
                                          type="checkbox"
                                          checked={rs.current}
                                          onChange={(e) => updateResearch(rs.id, "current", e.target.checked)}
                                          className="rounded"
                                        />
                                        {resumeLang === "en" ? "Ongoing" : "Masih berjalan"}
                                      </Label>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`rs-${i}-description`}>{resumeLang === "en" ? "Description (one bullet per line)" : "Deskripsi (satu bullet per baris)"}</Label>
                                  <textarea
                                    id={`rs-${i}-description`}
                                    onInput={autoGrowTextarea}
                                    className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                    placeholder={resumeLang === "en" ? "Contributions, methods, results. One per line." : "Kontribusi, metode, hasil. Satu per baris."}
                                    value={rs.description}
                                    onChange={(e) => updateResearch(rs.id, "description", e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <ItemMoveButtons onUp={() => moveResearch(i, -1)} onDown={() => moveResearch(i, 1)} upDisabled={i === 0} downDisabled={i === (resume.research ?? []).length - 1} label={resumeLang === "en" ? "Research" : "Riset"} />
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeResearch(rs.id)}>
                                  <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" className="w-full gap-2" onClick={addResearch}>
                          <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Research" : "Tambah Riset"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "projects") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={FileText} color="bg-sky-500">
                      <div className="space-y-4">
                        {resume.projects.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No projects yet. Add your portfolio projects." : "Belum ada proyek. Tambahkan proyek portfoliomu."}
                          </p>
                        )}
                        {resume.projects.map((proj, i) => (
                          <Card key={proj.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`proj-${i}-name`}>{resumeLang === "en" ? "Project Name" : "Nama Proyek"}</Label>
                                  <Input id={`proj-${i}-name`} value={proj.name} onChange={(e) => updateProject(proj.id, "name", e.target.value)} placeholder={resumeLang === "en" ? "e.g. E-Commerce App" : "cth. Aplikasi E-Commerce"} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`proj-${i}-description`}>{resumeLang === "en" ? "Description" : "Deskripsi"}</Label>
                                  <textarea
                                    id={`proj-${i}-description`}
                                    onInput={autoGrowTextarea}
                                    className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                    placeholder={resumeLang === "en" ? "Describe the project, your role, tech stack, impact..." : "Jelaskan proyek, peranmu, teknologi, dampak..."}
                                    value={proj.description}
                                    onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`proj-${i}-technologies`}>{resumeLang === "en" ? "Technologies (comma separated)" : "Teknologi (pisah koma)"}</Label>
                                    <Input
                                      id={`proj-${i}-technologies`}
                                      value={techDrafts[proj.id] ?? (proj.technologies || []).join(", ")}
                                      onChange={(e) => setTechDrafts((d) => ({ ...d, [proj.id]: e.target.value }))}
                                      onBlur={(e) => {
                                        updateProject(proj.id, "technologies", parseList(e.target.value))
                                        setTechDrafts((d) => {
                                          const next = { ...d }
                                          delete next[proj.id]
                                          return next
                                        })
                                      }}
                                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                                      placeholder="React, Node.js, Tailwind"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`proj-${i}-url`}>URL</Label>
                                    <Input id={`proj-${i}-url`} value={proj.url || ""} onChange={(e) => updateProject(proj.id, "url", e.target.value)} placeholder="https://github.com/..." />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <ItemMoveButtons onUp={() => moveProject(i, -1)} onDown={() => moveProject(i, 1)} upDisabled={i === 0} downDisabled={i === resume.projects.length - 1} label={resumeLang === "en" ? "Project" : "Proyek"} />
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeProject(proj.id)}>
                                  <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" className="w-full gap-2" onClick={addProject}>
                          <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Project" : "Tambah Proyek"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "education") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={GraduationCap} color="bg-amber-500">
                      <div className="space-y-4">
                        {resume.education.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">{resumeLang === "en" ? "No education yet." : "Belum ada pendidikan."}</p>
                        )}
                        {resume.education.map((edu, i) => (
                          <Card key={edu.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2 sm:col-span-2">
                                  <Label>{resumeLang === "en" ? "Level" : "Jenjang"}</Label>
                                  {/* Bukan input tunggal: dua tombol toggle. Diberi
                                      role group + nama agar terbaca sebagai satu kelompok. */}
                                  <div
                                    className="flex gap-2 flex-wrap"
                                    role="group"
                                    aria-label={resumeLang === "en" ? "Education level" : "Jenjang pendidikan"}
                                  >
                                    {([
                                      ["univ", resumeLang === "en" ? "University" : "Perguruan Tinggi"],
                                      ["school", resumeLang === "en" ? "High School" : "SMA/SMK/Sederajat"],
                                    ] as const).map(([val, label]) => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => updateEducation(edu.id, "level", val)}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                          (edu.level ?? "univ") === val
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/50"
                                        )}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edu-${i}-institution`}>{resumeLang === "en" ? "Institution" : "Institusi"}</Label>
                                  <Input id={`edu-${i}-institution`} value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} placeholder={resumeLang === "en" ? "University / School name" : "Nama universitas/sekolah"} />
                                </div>
                                {(edu.level ?? "univ") === "univ" && (
                                  <div className="space-y-2">
                                    <Label htmlFor={`edu-${i}-degree`}>{resumeLang === "en" ? "Degree" : "Gelar"}</Label>
                                    <Input id={`edu-${i}-degree`} value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder="S1, B.Sc., Master" />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <Label htmlFor={`edu-${i}-field`}>{resumeLang === "en" ? "Major / Field" : "Jurusan"}</Label>
                                  <Input id={`edu-${i}-field`} value={edu.field} onChange={(e) => updateEducation(edu.id, "field", e.target.value)} placeholder={(edu.level ?? "univ") === "univ" ? (resumeLang === "en" ? "Major" : "Nama jurusan/prodi") : (resumeLang === "en" ? "Major (optional)" : "Jurusan/Program keahlian (opsional)")} />
                                </div>
                                {(edu.level ?? "univ") === "univ" && (
                                  <div className="space-y-2">
                                    <Label htmlFor={`edu-${i}-gpa`}>GPA / IPK</Label>
                                    <Input id={`edu-${i}-gpa`} value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} placeholder="3.50" />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <Label htmlFor={`edu-${i}-startDate`}>{resumeLang === "en" ? "Start Date" : "Tanggal Mulai"}</Label>
                                  <Input id={`edu-${i}-startDate`} type="month" value={edu.startDate} onChange={(e) => updateEducation(edu.id, "startDate", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edu-${i}-endDate`}>{resumeLang === "en" ? "End Date" : "Tanggal Selesai"}</Label>
                                  <Input id={`edu-${i}-endDate`} type="month" value={edu.endDate} onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)} placeholder={resumeLang === "en" ? "Leave empty if ongoing" : "Kosongkan bila masih berjalan"} />
                                </div>
                              </div>
                              {(edu.level ?? "univ") === "univ" && (
                                <div className="space-y-3 mt-4 border-t border-border/50 pt-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`edu-${i}-thesisTitle`}>{resumeLang === "en" ? "Thesis Title (optional)" : "Judul Skripsi / Tugas Akhir (opsional)"}</Label>
                                    <Input id={`edu-${i}-thesisTitle`} value={edu.thesisTitle ?? ""} onChange={(e) => updateEducation(edu.id, "thesisTitle", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Content-Based Job Recommendation System" : "cth: Sistem Rekomendasi Lowongan Berbasis Konten"} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`edu-${i}-thesisDescription`}>{resumeLang === "en" ? "Thesis Description (optional)" : "Deskripsi Skripsi (opsional)"}</Label>
                                    <textarea
                                      id={`edu-${i}-thesisDescription`}
                                      onInput={autoGrowTextarea}
                                      className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                      placeholder={resumeLang === "en" ? "What you did for thesis: method, tech, results..." : "Apa yang dikerjakan di skripsi: metode, teknologi, hasil..."}
                                      value={edu.thesisDescription ?? ""}
                                      onChange={(e) => updateEducation(edu.id, "thesisDescription", e.target.value)}
                                    />
                                  </div>
</div>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <ItemMoveButtons onUp={() => moveEducation(i, -1)} onDown={() => moveEducation(i, 1)} upDisabled={i === 0} downDisabled={i === resume.education.length - 1} label={resumeLang === "en" ? "Education" : "Pendidikan"} />
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeEducation(edu.id)}>
                                  <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" className="w-full gap-2" onClick={addEducation}>
                          <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Education" : "Tambah Pendidikan"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "skills") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={Wrench} color="bg-rose-500">
                      <div className="space-y-4">
                        {(resume.skillGroups ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            {resumeLang === "en" ? "No skill groups yet. Add your first category (e.g. Programming Languages)." : "Belum ada grup skill. Tambahkan kategori pertama (cth. Programming Languages)."}
                          </p>
                        )}
                        {(resume.skillGroups ?? []).map((g, i) => (
                          <Card key={g.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <Label htmlFor={`skill-${i}-title`}>{resumeLang === "en" ? "Category title (e.g. Programming Languages)" : "Judul kategori (cth. Programming Languages)"}</Label>
                                <Input
                                  id={`skill-${i}-title`}
                                  value={g.title}
                                  onChange={(e) => updateSkillGroup(g.id, "title", e.target.value)}
                                  placeholder="Programming Languages"
                                />
                              </div>
                              <div className="space-y-2 mt-3">
                                <Label htmlFor={`skill-${i}-items`}>{resumeLang === "en" ? "Skills (comma or newline separated)" : "Skills (pisah koma atau baris baru)"}</Label>
                                <textarea
                                  id={`skill-${i}-items`}
                                  onInput={autoGrowTextarea}
                                  className="w-full min-h-[120px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                  placeholder="JavaScript, TypeScript, Python"
                                  value={skillDrafts[g.id] ?? (g.items ?? []).join(", ")}
                                  onChange={(e) => setSkillDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                                  onBlur={(e) => {
                                    updateSkillGroup(g.id, "items", parseList(e.target.value))
                                    setSkillDrafts((d) => {
                                      const next = { ...d }
                                      delete next[g.id]
                                      return next
                                    })
                                  }}
                                />
                                {(g.items ?? []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(g.items ?? []).map((item, i) => (
                                      <Badge key={i} variant="secondary" className="px-2.5 py-1">{item}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <ItemMoveButtons onUp={() => moveSkillGroup(i, -1)} onDown={() => moveSkillGroup(i, 1)} upDisabled={i === 0} downDisabled={i === (resume.skillGroups ?? []).length - 1} label={resumeLang === "en" ? "Skill group" : "Grup skill"} />
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeSkillGroup(g.id)}>
                                  <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" className="w-full gap-2" onClick={addSkillGroup}>
                          <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Skill Category" : "Tambah Kategori Skill"}
                        </Button>
                      </div>
                    </SectionCard>
                  )
                  if (sid === "awards") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid, false)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={Award} color="bg-amber-500" defaultOpen={false}>
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {resumeLang === "en" ? "Awards (bullets with year)" : "Penghargaan (bullet + tahun)"}
                          </p>
                          {(resume.awards ?? []).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">{resumeLang === "en" ? "No awards yet." : "Belum ada penghargaan."}</p>
                          )}
                          {(resume.awards ?? []).map((raw, i) => {
                            const a = typeof raw === "string" ? { id: raw, title: raw, organizer: "", month: "", year: "" } : raw
                            return (
                              <Card key={a.id} className="border-border/50">
                                <CardContent className="pt-4">
                                  <div className="grid grid-cols-1 gap-3">
                                    <div className="space-y-2">
                                      <Label htmlFor={`aw-${i}-title`}>{resumeLang === "en" ? "Placement + Name" : "Juara + Nama"}</Label>
                                      <Input id={`aw-${i}-title`} value={a.title} onChange={(e) => updateAwardItem(a.id, "title", e.target.value)} placeholder={resumeLang === "en" ? "e.g. 2nd Place Hackathon 2025" : "cth. Juara 2 Hackathon 2025"} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                      <div className="space-y-2">
                                        <Label htmlFor={`aw-${i}-organizer`}>{resumeLang === "en" ? "Organizer" : "Penyelenggara"}</Label>
                                        <Input id={`aw-${i}-organizer`} value={a.organizer} onChange={(e) => updateAwardItem(a.id, "organizer", e.target.value)} placeholder="Komdigi, Microsoft" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <Label htmlFor={`aw-${i}-month`}>{resumeLang === "en" ? "Month" : "Bulan"}</Label>
                                          <select
                                            id={`aw-${i}-month`}
                                            value={a.month ?? ""}
                                            onChange={(e) => updateAwardItem(a.id, "month", e.target.value)}
                                            className="w-full h-10 rounded-xl border-2 border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                                          >
                                            <option value="">-</option>
                                            {(resumeLang === "en" ? MONTH_SHORT_EN : MONTH_SHORT_ID).map((m, i) => (
                                              <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{m}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor={`aw-${i}-year`}>{resumeLang === "en" ? "Year" : "Tahun"}</Label>
                                          <Input id={`aw-${i}-year`} value={a.year} onChange={(e) => updateAwardItem(a.id, "year", e.target.value)} placeholder="2025" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <ItemMoveButtons onUp={() => moveAward(i, -1)} onDown={() => moveAward(i, 1)} upDisabled={i === 0} downDisabled={i === (resume.awards ?? []).length - 1} label={resumeLang === "en" ? "Award" : "Penghargaan"} />
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => removeAwardItem(a.id)}>
                                      <Trash2 className="w-4 h-4" />{resumeLang === "en" ? "Remove" : "Hapus"}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                          <Button variant="outline" className="w-full gap-2" onClick={addAwardItem}>
                            <Plus className="w-4 h-4" />{resumeLang === "en" ? "Add Award" : "Tambah Penghargaan"}
                          </Button>
                        </div>
                        <div className="space-y-3 border-t border-border/50 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {resumeLang === "en" ? "Certifications (one line)" : "Sertifikasi (satu baris)"}
                          </p>
                          {(resume.certifications ?? []).length > 0 ? (
                            <div className="space-y-2">
                              {(resume.certifications ?? []).map((cert, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
                                  <span className="flex-1 min-w-0 truncate text-sm">{cert}</span>
                                  <ItemMoveButtons onUp={() => moveCertification(i, -1)} onDown={() => moveCertification(i, 1)} upDisabled={i === 0} downDisabled={i === (resume.certifications ?? []).length - 1} label={resumeLang === "en" ? "Certification" : "Sertifikasi"} />
                                  <button onClick={() => removeCertification(i)} title={resumeLang === "en" ? "Remove" : "Hapus"} aria-label={(resumeLang === "en" ? "Remove certification: " : "Hapus sertifikasi: ") + cert} className="p-2.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-2">{resumeLang === "en" ? "No certifications yet." : "Belum ada sertifikasi."}</p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder={resumeLang === "en" ? "Add certification..." : "Tambah sertifikasi..."}
                              className="flex-1"
                              aria-label={resumeLang === "en" ? "Add certification" : "Tambah sertifikasi"}
                              value={newCert}
                              onChange={(e) => setNewCert(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && addCertification()}
                            />
                            <Button variant="outline" size="sm" onClick={addCertification}>{resumeLang === "en" ? "Add" : "Tambah"}</Button>
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  )
                                    if (sid === "languages") return (
                    <SectionCard key={sid} open={isSectionCardOpen(sid, false)} onOpenChange={(o) => setSectionCardOpen(sid, o)} title={getSectionLabel(sid, resumeLang)} icon={Languages} color="bg-pink-500" defaultOpen={false}>
                      <div className="space-y-3">
                        {resume.languages.length > 0 ? (
                          <div className="space-y-2">
                            {resume.languages.map((lang, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
                                <span className="flex-1 min-w-0 truncate text-sm">{lang}</span>
                                <ItemMoveButtons onUp={() => moveLanguage(i, -1)} onDown={() => moveLanguage(i, 1)} upDisabled={i === 0} downDisabled={i === resume.languages.length - 1} label={resumeLang === "en" ? "Language" : "Bahasa"} />
                                <button onClick={() => removeLanguage(i)} title={resumeLang === "en" ? "Remove" : "Hapus"} aria-label={(resumeLang === "en" ? "Remove language: " : "Hapus bahasa: ") + lang} className="p-2.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                            </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">{resumeLang === "en" ? "No languages yet." : "Belum ada bahasa."}</p>
                        )}
                        <div className="flex gap-2">
                          <Input
                            placeholder={resumeLang === "en" ? "Add language..." : "Tambah bahasa..."}
                            className="flex-1"
                            aria-label={resumeLang === "en" ? "Add language" : "Tambah bahasa"}
                            value={newLang}
                            onChange={(e) => setNewLang(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addLanguage()}
                          />
                          <Button variant="outline" size="sm" onClick={addLanguage}>{resumeLang === "en" ? "Add" : "Tambah"}</Button>
                        </div>
                      </div>
                    </SectionCard>
                  )
                  return null
                })}
              </>
            )}
          </div>

          <div className="space-y-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pb-8">
            <div className="sticky top-24 lg:static">
              {/* T8/T10b: chip autosave + progress juga di sidebar. */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tersimpan otomatis di browser ini
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {filledSections}/8 bagian terisi
                </span>
              </div>
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Wand2 className="w-4 h-4 text-primary" />
                    Quick Start
                  </CardTitle>
                  <CardDescription>Buat CV otomatis dari lowongan yang sudah dianalisis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full gap-2 text-sm border-primary/40" onClick={requestGenerate} disabled={generatingSample}>
                    {generatingSample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {generatingSample ? "Membuat..." : "Generate Sample CV"}
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setShowImportTools(!showImportTools)}>
                    <Upload className="w-4 h-4" />
                    {showImportTools ? "Tutup Import CV" : "Import dari CV"}
                  </Button>
                  {preGenerate && (
                    <Button variant="ghost" className="w-full gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={undoGenerate}>
                      <RotateCcw className="w-4 h-4" />
                      {resumeLang === "en" ? "Undo last generate" : "Urungkan generate terakhir"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              

              

              <Card className="border-border/50 mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{resumeLang === "en" ? "Section Order" : "Urutan Section"}</CardTitle>
                      <CardDescription>{resumeLang === "en" ? "Reorder and toggle sections in preview & PDF" : "Atur posisi dan tampilkan section di preview & PDF"}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetLayout} title="Kembalikan urutan bawaan" className="gap-1 h-auto px-2 py-1 text-xs">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {sectionOrder.map((id, idx) => {
                      const hidden = hiddenSections.includes(id)
                      return (
                        <div
                          key={id}
                          className={cn(
                            "flex items-center gap-1.5 p-2 rounded-lg border transition-colors",
                            hidden ? "border-border/50 opacity-60" : "border-border bg-card"
                          )}
                        >
                          <span className="text-[10px] font-bold text-muted-foreground w-4 text-center shrink-0">{idx + 1}</span>
                          <span className="text-xs font-medium flex-1 min-w-0 truncate">{getSectionLabel(id, resumeLang)}</span>
                          <button
                            onClick={() => toggleSection(id)}
                            title={hidden ? "Tampilkan section" : "Sembunyikan section"}
                            aria-label={hidden ? `Tampilkan ${getSectionLabel(id, resumeLang)}` : `Sembunyikan ${getSectionLabel(id, resumeLang)}`}
                            className="p-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => moveSection(id, -1)}
                            disabled={idx === 0}
                            title="Pindah ke atas"
                            aria-label={`Pindah ${getSectionLabel(id, resumeLang)} ke atas`}
                            className="p-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSection(id, 1)}
                            disabled={idx === sectionOrder.length - 1}
                            title="Pindah ke bawah"
                            aria-label={`Pindah ${getSectionLabel(id, resumeLang)} ke bawah`}
                            className="p-2.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  {/* T11: preset fresh graduate — sembunyikan section yang
                      biasanya tidak relevan, data tetap tersimpan. */}
                  <button
                    onClick={applyFreshGraduatePreset}
                    className="w-full mt-3 rounded-xl border border-border px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    title="Sembunyikan Riset, Proyek, dan Organisasi (data tidak dihapus)"
                  >
                    <span className="block font-semibold">Preset: Sederhana (fresh graduate)</span>
                    <span className="block text-[10px] mt-0.5">Sembunyikan Riset, Proyek, Organisasi. Datamu tidak hilang.</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Section kosong otomatis disembunyikan di preview. Pengaturan tersimpan otomatis.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Export</CardTitle>
                  <CardDescription>
                    Cetak CV jadi PDF, atau simpan datamu sebagai file agar bisa dipindah perangkat.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" size="lg" onClick={startPrintFlow} disabled={exportingPdf}>
                    {exportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    {exportingPdf ? "Menyiapkan PDF..." : "Cetak / Simpan PDF"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Di dialog berikutnya, pilih tujuan &apos;Save as PDF&apos; / &apos;Simpan sebagai PDF&apos; lalu Simpan.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportJson}>
                      <Save className="w-3.5 h-3.5" />
                      Simpan data ke file
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => importFileRef.current?.click()}>
                      <FolderOpen className="w-3.5 h-3.5" />
                      Muat dari file
                    </Button>
                  </div>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportJsonFile}
                  />
                  <button
                    onClick={() => setCompactOnePage((v) => !v)}
                    aria-pressed={compactOnePage}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/50"
                  >
                    <span>
                      <span className="block text-xs font-semibold">
                        {resumeLang === "en" ? "Fit into 1 page" : "Padatkan ke 1 halaman"}
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        {contentH > A4_CONTENT_PX
                          ? (resumeLang === "en"
                            ? `Content ≈ ${estPages} pages${compactOnePage ? ` → compacted to ${compactPct}%` : " → downloads as-is"}`
                            : `Konten ≈ ${estPages} halaman${compactOnePage ? ` → dipadatkan ${compactPct}%` : " → terdownload apa adanya"}`)
                          : (resumeLang === "en" ? "Content fits 1 page" : "Konten muat 1 halaman")}
                      </span>
                    </span>
                    <span className={cn(
                      "relative w-9 h-5 rounded-full transition-colors shrink-0",
                      compactOnePage ? "bg-primary" : "bg-muted"
                    )}>
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                        compactOnePage ? "left-[18px]" : "left-0.5"
                      )} />
                    </span>
                  </button>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Bahasa Resume</span>
                    <div className="flex items-center gap-1 rounded-lg border p-1">
                      <button
                        onClick={() => handleToggleLanguage("id")}
                        disabled={translating || resumeLang === "id"}
                        className={cn(
                          "px-3 py-2 min-h-[40px] rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                          resumeLang === "id" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Terjemahkan ke Bahasa Indonesia"
                      >
                        {translating && resumeLang !== "id" && <Loader2 className="w-3 h-3 animate-spin" />}
                        ID
                      </button>
                      <button
                        onClick={() => handleToggleLanguage("en")}
                        disabled={translating || resumeLang === "en"}
                        className={cn(
                          "px-3 py-2 min-h-[40px] rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                          resumeLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Translate to English"
                      >
                        {translating && resumeLang !== "en" && <Loader2 className="w-3 h-3 animate-spin" />}
                        EN
                      </button>
                    </div>
                  </div>
                  {translating && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Menerjemahkan resume...
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Untuk optimasi konten, gunakan analisis skor ATS agar saran yang diberikan tepat sasaran.
                  </p>
                  <div className="border-t border-border/60 pt-3 mt-1">
                    <button
                      onClick={() => setShowWipeConfirm(true)}
                      className="text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2 transition-colors"
                    >
                      Hapus semua data saya
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Menghapus isi CV, pengaturan, dan konfigurasi API dari browser ini.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 mt-4 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary"><Sparkles className="w-5 h-5" /></div>
                    <div>
                      <p className="text-sm font-semibold">Butuh Bantuan?</p>
                      <p className="text-xs text-muted-foreground">
                        Optimasi konten resumemu agar lebih sesuai dengan target lowongan
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* T6: aksi cetak mengambang di bawah layar kecil, agar tombol export
          tidak jatuh di bawah seluruh form. Disembunyikan di layar lg+. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          className="w-full gap-2 h-12 text-base"
          onClick={startPrintFlow}
          disabled={exportingPdf}
        >
          {exportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {exportingPdf ? "Menyiapkan PDF..." : "Cetak / Simpan PDF"}
        </Button>
      </div>
    </section>
  )
}
