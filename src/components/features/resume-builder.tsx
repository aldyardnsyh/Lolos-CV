"use client"

import { useState, useCallback, useRef, useEffect } from "react"

import {
  FileText, Plus, Trash2, Download, Sparkles, Loader2, Eye, Edit3,
  ChevronDown, ChevronUp, User, Users, Briefcase, GraduationCap, Wrench,
  Globe, Award, Languages, CheckCircle2, AlertCircle, Upload, Wand2,
  EyeOff, RotateCcw, ArrowUp, ArrowDown, AlertTriangle, Heart, ExternalLink, X,
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
import { pushBusy } from "@/lib/busy"
import { CVUploader } from "@/components/features/cv-uploader"
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

function getDisplayAwards(resume: ResumeData): string[] {
  const a = (resume.awards ?? []).map((x) => String(x ?? "").trim()).filter(Boolean)
  if (a.length > 0) return a
  const legacy = [
    ...((resume as any).certifications ?? []),
    ...((resume as any).achievements ?? []),
  ].map((x) => String(x ?? "").trim()).filter(Boolean)
  return legacy
}

function bulletLines(text: string | undefined | null): string[] {
  return String(text ?? "").split("\n").map((l) => l.trim()).filter(Boolean)
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
  | "skills" | "awards" | "languages"

const DEFAULT_SECTION_ORDER: ResumeSectionId[] = [
  "summary", "experiences", "organizations", "projects", "education",
  "skills", "awards", "languages",
]

const SECTION_LABELS_EN: Record<ResumeSectionId, string> = {
  summary: "Summary",
  experiences: "Professional Experience",
  organizations: "Organizations",
  projects: "Selected Projects",
  education: "Education",
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

function SectionCard({
  title, icon: Icon, color, children, defaultOpen = true,
}: {
  title: string; icon: any; color: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg text-white", color)}><Icon className="w-4 h-4" /></div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-2 pb-4">{children}</CardContent>}
    </Card>
  )
}

export function ResumeBuilder() {
  const [resume, setResume] = useState<ResumeData>(createEmptyResume)
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>("corporate")
  const [preview, setPreview] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [newLang, setNewLang] = useState("")
  const [newAward, setNewAward] = useState("")
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ show: false, message: "", type: "success" })
  const [showImportTools, setShowImportTools] = useState(false)
  const [generatingSample, setGeneratingSample] = useSampleGenerating()
  const [exportingPdf, setExportingPdf] = useState(false)
  const [resumeLang, setResumeLang] = useState<"id" | "en">("en")
  const [translating, setTranslating] = useState(false)
  const [cvFont, setCvFont] = useState<CvFont>("elegant")
  const [cvSize, setCvSize] = useState<CvFontSize>("medium")
  const [accentIdx, setAccentIdx] = useState(0)
  const [sectionOrder, setSectionOrder] = useState<ResumeSectionId[]>(DEFAULT_SECTION_ORDER)
  const [hiddenSections, setHiddenSections] = useState<ResumeSectionId[]>([])
  const [pageMode, setPageMode] = useState<1 | 2>(1)
  const [contentH, setContentH] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [preGenerate, setPreGenerate] = useState<ResumeData | null>(null)
  const [showSupportPrompt, setShowSupportPrompt] = useState(false)

  const SAWERIA_URL = "https://saweria.co/pogungsoftwarehouse"

  // Edit & preview = dua layer terpisah: masing-masing ingat posisi
  // scroll-nya sendiri, jadi pindah mode tidak melemparmu ke posisi asing.
  const editScrollRef = useRef(0)
  const previewScrollRef = useRef(0)
  const togglePreview = () => {
    const goingToPreview = !preview
    if (goingToPreview) {
      editScrollRef.current = window.scrollY
    } else {
      previewScrollRef.current = window.scrollY
    }
    setPreview(goingToPreview)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: goingToPreview ? previewScrollRef.current : editScrollRef.current,
          behavior: "auto",
        })
      })
    })
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
          if ((l as { pages?: unknown }).pages === 2) setPageMode(2)
        }
      } catch {}
    }

    const handleResumeUpdate = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail
      if (!detail) return
      if (typeof detail === "object" && detail !== null && "resume" in detail && (detail as { resume?: unknown }).resume) {
        const wrapped = detail as { resume: ResumeData; lang?: unknown }
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
    return () => window.removeEventListener("resume_data_updated", handleResumeUpdate)
  }, [])

  useEffect(() => {
    safeLocalSet("resume_data", JSON.stringify(resume))
  }, [resume])

  useEffect(() => {
    safeLocalSet("resume_style", JSON.stringify({ font: cvFont, size: cvSize, accent: accentIdx }))
  }, [cvFont, cvSize, accentIdx])

  useEffect(() => {
    safeLocalSet("resume_layout", JSON.stringify({ order: sectionOrder, hidden: hiddenSections, pages: pageMode }))
  }, [sectionOrder, hiddenSections, pageMode])

  // Ukur tinggi konten TANPA zoom (hanya untuk indikator overflow & garis batas halaman).
  // Preview tidak di-zoom sama sekali: ukuran font diatur via CSS var --cv-scale
  // di .cv-paper (lihat globals.css), layout/kertas tetap 210mm.
  useEffect(() => {
    if (!preview) return
    const measure = () => {
      const el = previewRef.current
      if (!el) return
      const h = el.scrollHeight
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
  }, [preview, pageMode, resume, selectedTemplate, cvFont, cvSize, accentIdx, sectionOrder, hiddenSections, resumeLang])

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

  const toggleSection = (id: ResumeSectionId) => {
    setHiddenSections((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const resetLayout = () => {
    setSectionOrder(DEFAULT_SECTION_ORDER)
    setHiddenSections([])
  }

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000)
  }

  const isResumeEmpty =
    !resume.personalInfo.fullName &&
    !resume.summary &&
    resume.experiences.length === 0 &&
    (resume.organizations ?? []).length === 0 &&
    resume.education.length === 0 &&
    resume.skills.length === 0 &&
    (resume.skillGroups ?? []).length === 0

  const handleGenerateSample = async () => {
    if (generatingSample) return
    setGeneratingSample(true)
    const doneBusy = pushBusy(resumeLang === "en" ? "Generating sample CV..." : "Membuat contoh CV...")
    try {
      const stored = safeLocalGet("job_analysis")
      if (!stored) {
        setResume(buildMockSampleResume(null))
        setResumeLang("en")
        safeLocalSet("resume_lang", "en")
        setShowImportTools(false)
        showToast("Contoh CV dibuat dari data sample. Lengkapi dengan data aslimu.")
        return
      }
      const jobPosting: JobPosting = JSON.parse(stored)
      const hasApi = !!getApiConfig()
      const sample = hasApi ? await generateSampleResume(jobPosting) : buildMockSampleResume(jobPosting)
      setResume(sample)
      setResumeLang("en")
      safeLocalSet("resume_lang", "en")
      setShowImportTools(false)
      showToast(
        hasApi
          ? "Sample CV berhasil dibuat! Silakan disesuaikan."
          : "Contoh CV dibuat dari lowonganmu (tanpa API). Silakan disesuaikan."
      )
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, "error")
    } finally {
      doneBusy()
      setGeneratingSample(false)
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 2MB", "error")
      return
    }
    const reader = new FileReader()
    reader.onload = () => updatePersonalInfo("photo", String(reader.result))
    reader.readAsDataURL(file)
  }

  const handleToggleLanguage = async (next: "id" | "en") => {
    if (next === resumeLang || translating) return
    if (isResumeEmpty) {
      setResumeLang(next)
      safeLocalSet("resume_lang", next)
      return
    }
    setTranslating(true)
    const doneBusy = pushBusy(resumeLang === "en" ? "Translating resume..." : "Menerjemahkan resume...")
    try {
      const translated = await translateResume(resume, next)
      setResume(translated)
      setResumeLang(next)
      safeLocalSet("resume_lang", next)
      showToast(next === "en" ? "CV diterjemahkan ke Bahasa Inggris" : "CV diterjemahkan ke Bahasa Indonesia")
    } catch (err: any) {
      showToast(`Gagal menerjemahkan: ${err.message}`, "error")
    } finally {
      doneBusy()
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

  const addAward = () => {
    if (!newAward.trim()) return
    setResume((prev) => ({ ...prev, awards: [...(prev.awards ?? []), newAward.trim()] }))
    setNewAward("")
  }

  const removeAward = (index: number) => {
    setResume((prev) => ({ ...prev, awards: (prev.awards ?? []).filter((_, i) => i !== index) }))
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
    const doneBusy = pushBusy(resumeLang === "en" ? "AI is writing..." : "AI sedang menulis...")
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
      doneBusy()
      setAiLoading(null)
    }
  }, [resume])

  const handleDownloadPdf = async () => {
    setExportingPdf(true)
    const doneBusy = pushBusy(resumeLang === "en" ? "Preparing PDF..." : "Menyiapkan PDF...")

    try {
      const previewEl = document.getElementById("resume-preview-content")
      if (!previewEl) {
        showToast("Silakan buka preview CV terlebih dahulu", "error")
        setExportingPdf(false)
        return
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

      // Small delay for render
      await new Promise((r) => setTimeout(r, 150))
      if (pageMode === 1) {
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
      window.print()

      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(clone)
        doneBusy()
        setExportingPdf(false)
      }, 500)
    } catch (err) {
      doneBusy()
      showToast("Gagal export: " + (err instanceof Error ? err.message : "unknown error"), "error")
      setExportingPdf(false)
    }
  }

  const template = templateStyles[selectedTemplate]
  const pal = ACCENT_PALETTES[accentIdx] ?? ACCENT_PALETTES[0]

  return (
    <section id="builder" className="py-24 relative">
      {toast.show && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border transition-all duration-300",
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {showGenerateConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowGenerateConfirm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
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
              <Button className="flex-1 gap-2" onClick={confirmGenerate} disabled={generatingSample}>
                <Wand2 className="w-4 h-4" />
                {resumeLang === "en" ? "Generate & Replace" : "Generate & Ganti"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSupportPrompt && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowSupportPrompt(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
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
                ? "LolosCV is free. A small donation keeps the servers running — totally optional."
                : "LolosCV gratis. Donasi kecil bikin server tetap jalan — sepenuhnya opsional."}
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <Button
                className="w-full gap-2"
                onClick={() => {
                  window.open(SAWERIA_URL, "_blank", "noopener,noreferrer")
                  setShowSupportPrompt(false)
                  handleDownloadPdf()
                }}
              >
                <Heart className="w-4 h-4" />
                {resumeLang === "en" ? "Donate via Saweria" : "Donasi via Saweria"}
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowSupportPrompt(false)
                  handleDownloadPdf()
                }}
                disabled={exportingPdf}
              >
                {resumeLang === "en" ? "Skip, download directly" : "Lewati, langsung download"}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold px-1">{preview ? "Preview CV" : "Edit CV"}</h3>
            <div className="sticky top-16 z-30 -mx-1 px-1 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">
                {resumeLang === "en" ? "Customize" : "Kustomisasi"}
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button variant="outline" size="sm" onClick={togglePreview} className="gap-2">
                  {preview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {preview ? "Edit" : "Preview"}
                </Button>
                <div className="flex items-center gap-1 rounded-lg border p-1 bg-background" title="Jumlah halaman CV">
                  {([1, 2] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPageMode(n)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        pageMode === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      )}
                      title={n === 1 ? "Padatkan agar pas 1 halaman" : "Alur normal, bisa 2 halaman"}
                    >
                      {n} hlm
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-lg border p-1 bg-background">
                  <button
                    onClick={() => handleToggleLanguage("id")}
                    disabled={translating || resumeLang === "id"}
                    title="Terjemahkan ke Bahasa Indonesia"
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
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
                      "px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
                      resumeLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {translating && resumeLang !== "en" && <Loader2 className="w-3 h-3 animate-spin" />}
                    EN
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as ResumeTemplate)}
                title={resumeLang === "en" ? "Template" : "Template"}
                aria-label="Template"
                className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hover:border-primary/50 transition-colors cursor-pointer max-w-[150px]"
              >
                {(Object.entries(templateStyles) as [ResumeTemplate, TemplateStyle][]).map(([key, t]) => (
                  <option key={key} value={key}>{t.name}</option>
                ))}
              </select>
              <select
                value={cvFont}
                onChange={(e) => setCvFont(e.target.value as CvFont)}
                title={resumeLang === "en" ? "Font" : "Font"}
                aria-label="Font"
                className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hover:border-primary/50 transition-colors cursor-pointer max-w-[130px]"
              >
                {(Object.keys(FONT_STACKS) as CvFont[]).map((f) => (
                  <option key={f} value={f}>{resumeLang === "en" ? FONT_LABELS_EN[f] : FONT_LABELS_ID[f]}</option>
                ))}
              </select>
              <select
                value={cvSize}
                onChange={(e) => setCvSize(e.target.value as CvFontSize)}
                title={resumeLang === "en" ? "Size" : "Ukuran"}
                aria-label="Size"
                className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hover:border-primary/50 transition-colors cursor-pointer"
              >
                {(Object.keys(FONT_SCALE) as CvFontSize[]).map((s) => (
                  <option key={s} value={s}>{resumeLang === "en" ? SIZE_LABELS_EN[s] : SIZE_LABELS_ID[s]}</option>
                ))}
              </select>
              {(selectedTemplate === "creative" || selectedTemplate === "modern") && (
                <div className="flex items-center gap-1" title={resumeLang === "en" ? "Accent color" : "Warna aksen"}>
                  {ACCENT_PALETTES.map((p, i) => (
                    <button
                      key={p.name}
                      onClick={() => setAccentIdx(i)}
                      title={resumeLang === "en" ? p.name : p.nameId}
                      aria-label={resumeLang === "en" ? p.name : p.nameId}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all",
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
                  <CVUploader onApply={(data) => { setResume(data); setShowImportTools(false); showToast("Data CV berhasil diimport!") }} />
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
                  {preview && pageMode === 1 && contentH > A4_CONTENT_PX && (
                    <p className="text-center text-[10px] text-muted-foreground mb-2 print:hidden">
                      {resumeLang === "en"
                        ? "Content exceeds 1 page — switch to 2 pages or use a smaller font size"
                        : "Konten melebihi 1 halaman — pilih 2 halaman atau kecilkan ukuran font"}
                    </p>
                  )}
                  {preview && pageMode === 2 && contentH > A4_CONTENT_PX && (
                    Array.from({ length: Math.floor(contentH / A4_CONTENT_PX) }, (_, i) => {
                      const top = (i + 1) * A4_CONTENT_PX
                      return (
                        <div
                          key={`pagebreak-${i}`}
                          className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-primary/60 print:hidden"
                          style={{ top }}
                        >
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                            Halaman {i + 2}
                          </span>
                        </div>
                      )
                    })
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
                          <p className="text-[9px] text-gray-500">
                            {[resume.personalInfo.linkedin, resume.personalInfo.portfolio].filter(Boolean).join(" | ")}
                          </p>
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
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="print:break-inside-avoid">
                                  <p className="text-[11px] font-bold text-gray-900">{proj.name}</p>
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
                              <div key={edu.id} className="flex justify-between items-start mb-0.5 print:break-inside-avoid">
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900">{edu.institution}</p>
                                  {eduMeta(edu, resumeLang) && <p className="text-[10px] italic text-gray-600">{eduMeta(edu, resumeLang)}</p>}
                                  {edu.thesisTitle && (
                                    <p className="text-[10px] text-gray-700 mt-0.5">
                                      <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                    </p>
                                  )}
                                  {edu.thesisDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.thesisDescription).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {edu.researchTitle && (
                                    <p className="text-[10px] text-gray-700 mt-0.5">
                                      <span className="font-semibold">{resumeLang === "en" ? "Research: " : "Riset: "}</span>{edu.researchTitle}
                                    </p>
                                  )}
                                  {edu.researchDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.researchDescription).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <p className="text-[9px] italic text-gray-500 shrink-0 ml-2 whitespace-nowrap">{formatResumeDate(edu.startDate)} - {formatResumeDate(edu.endDate)}</p>
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
                        {isSectionVisible("awards") && getDisplayAwards(resume).length > 0 && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("awards", resumeLang)}</h3>
                            <ul className="list-disc list-inside space-y-0.5">
                              {getDisplayAwards(resume).map((a, i) => (
                                <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{a}</li>
                              ))}
                            </ul>
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
                            <p className="text-[10px] text-gray-500 mt-1">
                              {[resume.personalInfo.linkedin, resume.personalInfo.portfolio].filter(Boolean).join(" | ")}
                            </p>
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
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="print:break-inside-avoid">
                                  <p className="text-[11px] font-bold text-gray-900">{proj.name}</p>
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
                              <div key={edu.id} className="flex justify-between items-start mb-0.5 print:break-inside-avoid">
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900">{edu.institution}</p>
                                  {eduMeta(edu, resumeLang) && <p className="text-[10px] italic text-gray-600">{eduMeta(edu, resumeLang)}</p>}
                                  {edu.thesisTitle && (
                                    <p className="text-[10px] text-gray-700 mt-0.5">
                                      <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                    </p>
                                  )}
                                  {edu.thesisDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.thesisDescription).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {edu.researchTitle && (
                                    <p className="text-[10px] text-gray-700 mt-0.5">
                                      <span className="font-semibold">{resumeLang === "en" ? "Research: " : "Riset: "}</span>{edu.researchTitle}
                                    </p>
                                  )}
                                  {edu.researchDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.researchDescription).map((line, i) => (
                                        <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <p className="text-[9px] italic text-gray-500 shrink-0 ml-2 whitespace-nowrap">{formatResumeDate(edu.startDate)} - {formatResumeDate(edu.endDate)}</p>
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
                        {isSectionVisible("awards") && getDisplayAwards(resume).length > 0 && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-400 pb-0.5 mb-1 print:break-after-avoid">{getSectionLabel("awards", resumeLang)}</h3>
                            <ul className="list-disc list-inside space-y-0.5">
                              {getDisplayAwards(resume).map((a, i) => (
                                <li key={i} className="text-[10px] text-gray-700 leading-relaxed">{a}</li>
                              ))}
                            </ul>
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
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {edu.researchTitle && (
                                    <p className="text-[11px] mt-1">
                                      <span className="font-semibold">{resumeLang === "en" ? "Research: " : "Riset: "}</span>{edu.researchTitle}
                                    </p>
                                  )}
                                  {edu.researchDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.researchDescription).map((line, i) => (
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">{line}</li>
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
                                  <p className="text-sm font-bold">{proj.name}</p>
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
                        {isSectionVisible("awards") && getDisplayAwards(resume).length > 0 && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-sm font-bold mb-2 inline-block px-3 py-1 rounded-lg text-white" style={{ backgroundColor: pal.main }}>{getSectionLabel("awards", resumeLang)}</h3>
                            <ul className="list-disc list-inside mt-3 space-y-1">
                              {getDisplayAwards(resume).map((a, i) => (
                                <li key={i} className="text-[11px] leading-relaxed">{a}</li>
                              ))}
                            </ul>
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
                          {resume.personalInfo.linkedin && <span>{resume.personalInfo.linkedin}</span>}
                          {resume.personalInfo.portfolio && <span>{resume.personalInfo.portfolio}</span>}
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
                                <div key={edu.id} className="flex justify-between items-start border-b border-gray-100 pb-1.5 print:break-inside-avoid">
                                  <div>
                                    <p className="text-sm font-semibold">{edu.institution}</p>
                                    {eduMeta(edu, resumeLang) && <p className="text-[11px] text-muted-foreground">{eduMeta(edu, resumeLang)}</p>}
                                    {edu.thesisTitle && (
                                      <p className="text-[11px] mt-1">
                                        <span className="font-semibold">{resumeLang === "en" ? "Thesis: " : "Skripsi: "}</span>{edu.thesisTitle}
                                      </p>
                                    )}
                                    {edu.thesisDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.thesisDescription).map((line, i) => (
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                    {edu.researchTitle && (
                                      <p className="text-[11px] mt-1">
                                        <span className="font-semibold">{resumeLang === "en" ? "Research: " : "Riset: "}</span>{edu.researchTitle}
                                      </p>
                                    )}
                                    {edu.researchDescription && (
                                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                      {bulletLines(edu.researchDescription).map((line, i) => (
                                        <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">{line}</li>
                                      ))}
                                    </ul>
                                  )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatResumeDate(edu.startDate)} - {formatResumeDate(edu.endDate)}</p>
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
                        {isSectionVisible("awards") && getDisplayAwards(resume).length > 0 && (
                          <div style={{ order: orderOf("awards") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("awards", resumeLang)}</h3>
                            <div className="flex flex-col gap-y-1">
                              {getDisplayAwards(resume).map((a, i) => (
                                <span key={i} className="text-[11px] flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: pal.main }} />
                                  {a}
                                </span>
                              ))}
                            </div>
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
                        {isSectionVisible("projects") && resume.projects.length > 0 && (
                          <div style={{ order: orderOf("projects") }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: pal.main }}>{getSectionLabel("projects", resumeLang)}</h3>
                            <div className="space-y-2">
                              {resume.projects.map((proj) => (
                                <div key={proj.id} className="print:break-inside-avoid">
                                  <p className="text-sm font-semibold">{proj.name}</p>
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
                <SectionCard title={resumeLang === "en" ? "Personal Information" : "Data Pribadi"} icon={User} color="bg-blue-500">
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
                        <Label>{label}</Label>
                        <Input
                          placeholder={placeholder}
                          type={type || "text"}
                          value={(resume.personalInfo as any)[key]}
                          onChange={(e) => updatePersonalInfo(key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Headline / Tagline</Label>
                      <Input
                        placeholder="cth: Machine Learning Engineer"
                        value={resume.personalInfo.headline ?? ""}
                        onChange={(e) => updatePersonalInfo("headline", e.target.value)}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title={resumeLang === "en" ? "Profile Photo (optional)" : "Foto Profil (opsional)"} icon={User} color="bg-cyan-500" defaultOpen={false}>
                  <div className="flex items-center gap-4">
                    {isSafePhotoSrc(resume.personalInfo.photo) ? (
                      <img src={resume.personalInfo.photo} alt="Preview foto" className="w-[72px] h-[108px] object-cover border" />
                    ) : (
                      <div className="w-[72px] h-[108px] bg-muted border border-dashed flex items-center justify-center text-[9px] text-muted-foreground text-center">Foto<br />2x3</div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input type="file" accept="image/jpeg,image/png,image/webp" className="text-xs" onChange={handlePhotoUpload} />
                      <p className="text-[10px] text-muted-foreground">
                        Format JPG/PNG/WebP, maksimal 2MB. Rasio pas foto 2:3 (lebar:tinggi), ukuran ideal 240x360px.
                        Foto dipakai di template ATS + Foto, tampil sebagai kotak pas foto.
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
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={Globe} color="bg-violet-500">
                      <div className="space-y-3">
                        <textarea
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
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={Briefcase} color="bg-emerald-500">
                      <div className="space-y-4">
                        {resume.experiences.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No experience yet. Click below to add." : "Belum ada pengalaman. Klik tombol di bawah untuk menambah."}
                          </p>
                        )}
                        {resume.experiences.map((exp) => (
                          <Card key={exp.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Company" : "Perusahaan"}</Label>
                                  <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder={resumeLang === "en" ? "Company name" : "Nama perusahaan"} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Position" : "Posisi"}</Label>
                                  <Input value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} placeholder={resumeLang === "en" ? "Job title" : "Jabatan"} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Location" : "Lokasi"}</Label>
                                  <Input value={exp.location} onChange={(e) => updateExperience(exp.id, "location", e.target.value)} placeholder="Jakarta, Indonesia" />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Start Date" : "Tanggal Mulai"}</Label>
                                  <Input type="month" value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "End Date" : "Tanggal Selesai"}</Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="month" value={exp.endDate}
                                      onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                                      disabled={exp.current}
                                      className={exp.current ? "opacity-50" : ""}
                                    />
                                    <Label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                                      <input
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
                                <Label>{resumeLang === "en" ? "Job Description" : "Deskripsi Pekerjaan"}</Label>
                                <textarea
                                  className="w-full min-h-[80px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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
                              <div className="flex justify-end mt-3">
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
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={Users} color="bg-teal-500">
                      <div className="space-y-4">
                        {(resume.organizations ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No organizational experience yet. Click below to add." : "Belum ada pengalaman organisasi. Klik tombol di bawah untuk menambah."}
                          </p>
                        )}
                        {(resume.organizations ?? []).map((org) => (
                          <Card key={org.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Organization" : "Organisasi"}</Label>
                                  <Input value={org.organization} onChange={(e) => updateOrganization(org.id, "organization", e.target.value)} placeholder={resumeLang === "en" ? "Organization name" : "Nama organisasi"} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Position / Role" : "Posisi / Jabatan"}</Label>
                                  <Input value={org.position} onChange={(e) => updateOrganization(org.id, "position", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Coordinator" : "cth. Koordinator"} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Location" : "Lokasi"}</Label>
                                  <Input value={org.location} onChange={(e) => updateOrganization(org.id, "location", e.target.value)} placeholder="Jakarta, Indonesia" />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Start Date" : "Tanggal Mulai"}</Label>
                                  <Input type="month" value={org.startDate} onChange={(e) => updateOrganization(org.id, "startDate", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "End Date" : "Tanggal Selesai"}</Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="month" value={org.endDate}
                                      onChange={(e) => updateOrganization(org.id, "endDate", e.target.value)}
                                      disabled={org.current}
                                      className={org.current ? "opacity-50" : ""}
                                    />
                                    <Label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                                      <input
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
                                <Label>{resumeLang === "en" ? "Description (one bullet per line)" : "Deskripsi (satu bullet per baris)"}</Label>
                                <textarea
                                  className="w-full min-h-[80px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                  placeholder={resumeLang === "en" ? "What you did, one achievement per line..." : "Apa yang dikerjakan, satu pencapaian per baris..."}
                                  value={org.description}
                                  onChange={(e) => updateOrganization(org.id, "description", e.target.value)}
                                />
                              </div>
                              <div className="flex justify-end mt-3">
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
                  if (sid === "projects") return (
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={FileText} color="bg-sky-500">
                      <div className="space-y-4">
                        {resume.projects.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {resumeLang === "en" ? "No projects yet. Add your portfolio projects." : "Belum ada proyek. Tambahkan proyek portfoliomu."}
                          </p>
                        )}
                        {resume.projects.map((proj) => (
                          <Card key={proj.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Project Name" : "Nama Proyek"}</Label>
                                  <Input value={proj.name} onChange={(e) => updateProject(proj.id, "name", e.target.value)} placeholder={resumeLang === "en" ? "e.g. E-Commerce App" : "cth. Aplikasi E-Commerce"} />
                                </div>
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Description" : "Deskripsi"}</Label>
                                  <textarea
                                    className="w-full min-h-[80px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                    placeholder={resumeLang === "en" ? "Describe the project, your role, tech stack, impact..." : "Jelaskan proyek, peranmu, teknologi, dampak..."}
                                    value={proj.description}
                                    onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>{resumeLang === "en" ? "Technologies (comma separated)" : "Teknologi (pisah koma)"}</Label>
                                    <Input
                                      value={(proj.technologies || []).join(", ")}
                                      onChange={(e) => updateProject(proj.id, "technologies", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                                      placeholder="React, Node.js, Tailwind"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>URL</Label>
                                    <Input value={proj.url || ""} onChange={(e) => updateProject(proj.id, "url", e.target.value)} placeholder="https://github.com/..." />
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end mt-3">
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
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={GraduationCap} color="bg-amber-500">
                      <div className="space-y-4">
                        {resume.education.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">{resumeLang === "en" ? "No education yet." : "Belum ada pendidikan."}</p>
                        )}
                        {resume.education.map((edu) => (
                          <Card key={edu.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2 sm:col-span-2">
                                  <Label>{resumeLang === "en" ? "Level" : "Jenjang"}</Label>
                                  <div className="flex gap-2 flex-wrap">
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
                                  <Label>{resumeLang === "en" ? "Institution" : "Institusi"}</Label>
                                  <Input value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} placeholder={resumeLang === "en" ? "University / School name" : "Nama universitas/sekolah"} />
                                </div>
                                {(edu.level ?? "univ") === "univ" && (
                                  <div className="space-y-2">
                                    <Label>{resumeLang === "en" ? "Degree" : "Gelar"}</Label>
                                    <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder="S1, B.Sc., Master" />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <Label>{resumeLang === "en" ? "Major / Field" : "Jurusan"}</Label>
                                  <Input value={edu.field} onChange={(e) => updateEducation(edu.id, "field", e.target.value)} placeholder={(edu.level ?? "univ") === "univ" ? (resumeLang === "en" ? "Major" : "Nama jurusan/prodi") : (resumeLang === "en" ? "Major (optional)" : "Jurusan/Program keahlian (opsional)")} />
                                </div>
                                {(edu.level ?? "univ") === "univ" && (
                                  <div className="space-y-2">
                                    <Label>GPA / IPK</Label>
                                    <Input value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} placeholder="3.50" />
                                  </div>
                                )}
                              </div>
                              {(edu.level ?? "univ") === "univ" && (
                                <div className="space-y-3 mt-4 border-t border-border/50 pt-4">
                                  <div className="space-y-2">
                                    <Label>{resumeLang === "en" ? "Thesis Title (optional)" : "Judul Skripsi / Tugas Akhir (opsional)"}</Label>
                                    <Input value={edu.thesisTitle ?? ""} onChange={(e) => updateEducation(edu.id, "thesisTitle", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Content-Based Job Recommendation System" : "cth: Sistem Rekomendasi Lowongan Berbasis Konten"} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{resumeLang === "en" ? "Thesis Description (optional)" : "Deskripsi Skripsi (opsional)"}</Label>
                                    <textarea
                                      className="w-full min-h-[70px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                      placeholder={resumeLang === "en" ? "What you did for thesis: method, tech, results..." : "Apa yang dikerjakan di skripsi: metode, teknologi, hasil..."}
                                      value={edu.thesisDescription ?? ""}
                                      onChange={(e) => updateEducation(edu.id, "thesisDescription", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{resumeLang === "en" ? "Research Experience (optional)" : "Penelitian Dosen / Research Assistant (opsional)"}</Label>
                                    <Input value={edu.researchTitle ?? ""} onChange={(e) => updateEducation(edu.id, "researchTitle", e.target.value)} placeholder={resumeLang === "en" ? "e.g. Research Assistant, NLP Lab" : "cth: Asisten Riset NLP, Lab AI Universitas"} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{resumeLang === "en" ? "Research Description (optional)" : "Deskripsi Kontribusi Riset (opsional)"}</Label>
                                    <textarea
                                      className="w-full min-h-[70px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                      placeholder={resumeLang === "en" ? "Role and contributions: data collection, experiments, publications..." : "Peran dan kontribusi di penelitian: pengumpulan data, eksperimen, publikasi..."}
                                      value={edu.researchDescription ?? ""}
                                      onChange={(e) => updateEducation(edu.id, "researchDescription", e.target.value)}
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-end mt-3">
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
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={Wrench} color="bg-rose-500">
                      <div className="space-y-4">
                        {(resume.skillGroups ?? []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            {resumeLang === "en" ? "No skill groups yet. Add your first category (e.g. Programming Languages)." : "Belum ada grup skill. Tambahkan kategori pertama (cth. Programming Languages)."}
                          </p>
                        )}
                        {(resume.skillGroups ?? []).map((g) => (
                          <Card key={g.id} className="border-border/50">
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <Label>{resumeLang === "en" ? "Category title (e.g. Programming Languages)" : "Judul kategori (cth. Programming Languages)"}</Label>
                                <Input
                                  value={g.title}
                                  onChange={(e) => updateSkillGroup(g.id, "title", e.target.value)}
                                  placeholder="Programming Languages"
                                />
                              </div>
                              <div className="space-y-2 mt-3">
                                <Label>{resumeLang === "en" ? "Skills (comma or newline separated)" : "Skills (pisah koma atau baris baru)"}</Label>
                                <textarea
                                  className="w-full min-h-[70px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                  placeholder="JavaScript, TypeScript, Python"
                                  value={(g.items ?? []).join(", ")}
                                  onChange={(e) => updateSkillGroup(g.id, "items", e.target.value)}
                                />
                                {(g.items ?? []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(g.items ?? []).map((item, i) => (
                                      <Badge key={i} variant="secondary" className="px-2.5 py-1">{item}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end mt-3">
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
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={Award} color="bg-amber-500" defaultOpen={false}>
                      <div className="space-y-3">
                        {(resume.awards ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {(resume.awards ?? []).map((a, i) => (
                              <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors group" onClick={() => removeAward(i)}>
                                {a}
                                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">&times;</span>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">{resumeLang === "en" ? "No awards or certifications yet." : "Belum ada penghargaan atau sertifikasi."}</p>
                        )}
                        <div className="flex gap-2">
                          <Input placeholder={resumeLang === "en" ? "Add award / certification..." : "Tambah penghargaan / sertifikasi..."} className="flex-1" value={newAward} onChange={(e) => setNewAward(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAward()} />
                          <Button variant="outline" size="sm" onClick={addAward}>{resumeLang === "en" ? "Add" : "Tambah"}</Button>
                        </div>
                      </div>
                    </SectionCard>
                  )
                                    if (sid === "languages") return (
                    <SectionCard key={sid} title={getSectionLabel(sid, resumeLang)} icon={Languages} color="bg-pink-500" defaultOpen={false}>
                      <div className="space-y-3">
                        {resume.languages.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {resume.languages.map((lang, i) => (
                              <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors group" onClick={() => removeLanguage(i)}>
                                {lang}
                                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">&times;</span>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">{resumeLang === "en" ? "No languages yet." : "Belum ada bahasa."}</p>
                        )}
                        <div className="flex gap-2">
                          <Input placeholder={resumeLang === "en" ? "Add language..." : "Tambah bahasa..."} className="flex-1" value={newLang} onChange={(e) => setNewLang(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLanguage()} />
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

          <div className="space-y-6">
            <div className="sticky top-24">
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
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => moveSection(id, -1)}
                            disabled={idx === 0}
                            title="Pindah ke atas"
                            aria-label={`Pindah ${getSectionLabel(id, resumeLang)} ke atas`}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSection(id, 1)}
                            disabled={idx === sectionOrder.length - 1}
                            title="Pindah ke bawah"
                            aria-label={`Pindah ${getSectionLabel(id, resumeLang)} ke bawah`}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Section kosong otomatis disembunyikan di preview. Pengaturan tersimpan otomatis.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Export</CardTitle>
                  <CardDescription>{pageMode === 1 ? "Download PDF 1 halaman (dipadatkan otomatis)" : "Download PDF alur normal (bisa 2 halaman)"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" size="lg" onClick={() => setShowSupportPrompt(true)} disabled={exportingPdf}>
                    {exportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    {exportingPdf ? "Menyiapkan PDF..." : "Download PDF"}
                  </Button>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Bahasa Resume</span>
                    <div className="flex items-center gap-1 rounded-lg border p-1">
                      <button
                        onClick={() => handleToggleLanguage("id")}
                        disabled={translating || resumeLang === "id"}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
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
                          "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
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
    </section>
  )
}
