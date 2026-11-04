"use client"

import { useState, useEffect } from "react"
import {
  Link2, Loader2, Building2, MapPin, Briefcase, ListChecks, Star, AlertCircle,
  Copy, CheckCircle2, ClipboardPaste, Wand2, AlertTriangle, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { analyzeJobPosting, analyzeJobText, extractKeyPoints, generateSampleResume, getApiConfig, safeLocalGet, safeLocalSet } from "@/lib/api"
import { buildMockSampleResume } from "@/lib/sample-mock"
import { useSampleGenerating } from "@/lib/sample-generation"
import type { JobPosting } from "@/types"

const sourceColors: Record<string, string> = {
  linkedin: "bg-[#0A66C2]",
  jobstreet: "bg-[#F05A28]",
  glints: "bg-[#4A90D9]",
  company: "bg-primary",
  other: "bg-primary",
}

const sourceNames: Record<string, string> = {
  linkedin: "LinkedIn",
  jobstreet: "JobStreet",
  glints: "Glints",
  company: "Company Website",
  other: "Other",
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// Pagar data-loss: cek apakah localStorage sudah berisi CV (bukan resume kosong).
function storedResumeHasContent(): boolean {
  try {
    const raw = safeLocalGet("resume_data")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!(
      parsed?.personalInfo?.fullName ||
      parsed?.summary ||
      (Array.isArray(parsed?.experiences) && parsed.experiences.length > 0) ||
      (Array.isArray(parsed?.organizations) && parsed.organizations.length > 0) ||
      (Array.isArray(parsed?.education) && parsed.education.length > 0) ||
      (Array.isArray(parsed?.research) && parsed.research.length > 0) ||
      (Array.isArray(parsed?.skills) && parsed.skills.length > 0) ||
      (Array.isArray(parsed?.skillGroups) && parsed.skillGroups.length > 0) ||
      (Array.isArray(parsed?.projects) && parsed.projects.length > 0) ||
      (Array.isArray(parsed?.certifications) && parsed.certifications.length > 0)
    )
  } catch {
    return false
  }
}

// Semua varian pesan "API belum dikonfigurasi" (konstanta api.ts maupun pesan
// lokal di komponen ini) diawali kalimat yang sama — dipakai untuk menawarkan
// mode demo di kartu error.
const API_NOT_CONFIGURED_PREFIX = "API belum dikonfigurasi"

function asStrList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.map((x) => String(x ?? "").trim()).filter(Boolean)
    : []
}

// Lowongan tersimpan (ditulis saat analisis sukses) untuk jalur mode demo
// bila kartu hasil belum ada di state.
function readStoredJob(): JobPosting | null {
  try {
    const raw = safeLocalGet("job_analysis")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as JobPosting) : null
  } catch {
    return null
  }
}

export function JobAnalyzer() {
  const [url, setUrl] = useState("")
  const [pasteText, setPasteText] = useState("")
  const [inputMode, setInputMode] = useState<"url" | "paste">("url")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<JobPosting | null>(null)
  const [rawText, setRawText] = useState<string>("")
  const [showRawText, setShowRawText] = useState(false)
  const [keyPoints, setKeyPoints] = useState<{ critical: string[]; important: string[]; niceToHave: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [generatingFromJob, setGeneratingFromJob] = useSampleGenerating()
  const [ctaMessage, setCtaMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)

  useEffect(() => {
    const check = () => setHasApiKey(!!getApiConfig())
    check()
    window.addEventListener("api_config_changed", check)
    return () => window.removeEventListener("api_config_changed", check)
  }, [])

  // Restorasi hasil analisis saat mount: sebelumnya kartu hasil tampak kosong
  // setelah refresh padahal "job_analysis" tersimpan. Input URL tidak
  // disimpan, jadi dibiarkan kosong.
  useEffect(() => {
    try {
      const raw = safeLocalGet("job_analysis")
      if (!raw) return
      const parsed = JSON.parse(raw) as (Partial<JobPosting> & { rawText?: unknown }) | null
      if (!parsed || typeof parsed !== "object") return
      if (!parsed.position && !parsed.companyName && !parsed.description) return
      setResult({
        url: String(parsed.url ?? ""),
        source: parsed.source ?? "other",
        companyName: String(parsed.companyName ?? ""),
        position: String(parsed.position ?? ""),
        location: String(parsed.location ?? ""),
        description: String(parsed.description ?? ""),
        keyRequirements: asStrList(parsed.keyRequirements),
        preferredQualifications: asStrList(parsed.preferredQualifications),
        responsibilities: asStrList(parsed.responsibilities),
        benefits: asStrList(parsed.benefits),
        jobStreams: Array.isArray(parsed.jobStreams) ? (parsed.jobStreams as JobPosting["jobStreams"]) : [],
        educationRequirements: asStrList(parsed.educationRequirements),
      })
      if (typeof parsed.rawText === "string") setRawText(parsed.rawText)
    } catch {}
  }, [])

  const handleAnalyze = async () => {
    const config = getApiConfig()
    if (!config) {
      setError("API belum dikonfigurasi. Silakan isi API Key di menu Konfigurasi API terlebih dahulu.")
      return
    }

    setAnalyzing(true)
    setError(null)
    setResult(null)
    setRawText("")
    setShowRawText(false)
    setKeyPoints(null)
    setCtaMessage(null)

    try {
      let jobData: JobPosting
      if (inputMode === "paste") {
        if (!pasteText.trim() || pasteText.trim().length < 10) {
          setError("Teks terlalu pendek. Minimal 10 karakter.")
          setAnalyzing(false)
          return
        }
        jobData = await analyzeJobText(pasteText.trim())
        setRawText(pasteText.trim())
      } else {
        if (!url.trim()) {
          setError("Masukkan URL lowongan kerja.")
          setAnalyzing(false)
          return
        }
        if (!isValidUrl(url.trim())) {
          setError("URL tidak valid. Masukkan URL lengkap (https://...)")
          setAnalyzing(false)
          return
        }
        const urlResult = await analyzeJobPosting(url.trim())
        jobData = urlResult
        setRawText(urlResult.rawText || "")
      }

      setResult(jobData)
      safeLocalSet("job_analysis", JSON.stringify(jobData))

      try {
        const points = await extractKeyPoints(jobData)
        setKeyPoints(points)
      } catch {}
    } catch (err: any) {
      setError(err.message || "Gagal menganalisis lowongan.")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopyResult = () => {
    if (!result) return
    const reqText = result.keyRequirements.length > 0 ? `\nRequirements: ${result.keyRequirements.join(", ")}` : ""
    const benText = result.benefits.length > 0 ? `\nBenefits: ${result.benefits.join(", ")}` : ""
    const text = `Perusahaan: ${result.companyName}
Posisi: ${result.position}
Lokasi: ${result.location}
Deskripsi: ${result.description}${reqText}${benText}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Generate bersifat destruktif bila CV user sudah terisi → minta konfirmasi
  // dulu (sama seperti jalur generate di dalam builder).
  const handleBuildResume = async () => {
    if (!result || generatingFromJob) return
    if (storedResumeHasContent()) {
      setShowReplaceConfirm(true)
      return
    }
    await performBuildResume()
  }

  // demoJob: diberikan lewat tombol "Coba Tanpa API Key (Mode Demo)" di kartu
  // error — boleh null (tanpa data lowongan) dan selalu memakai mock tanpa
  // API. Tanpa argumen = jalur biasa dari hasil analisis (pakai API bila ada).
  // Jalur destruktif yang sama: backup dulu, modal konfirmasi tetap jalan.
  const performBuildResume = async (demoJob?: JobPosting | null) => {
    const isDemo = demoJob !== undefined
    const job = isDemo ? demoJob : result
    if ((!job && !isDemo) || generatingFromJob) return
    setGeneratingFromJob(true)
    setShowReplaceConfirm(false)
    setCtaMessage(null)
    try {
      // Backup dulu ke key yang SAMA dengan tombol "Urungkan generate terakhir"
      // di builder, baru timpa via event.
      const previous = safeLocalGet("resume_data")
      if (previous) {
        try { safeLocalSet("resume_data_before_generate", previous) } catch {}
      }
      const hasApi = !!getApiConfig()
      const sample = isDemo
        ? buildMockSampleResume(job)
        : hasApi && job
          ? await generateSampleResume(job)
          : buildMockSampleResume(job)
      window.dispatchEvent(new CustomEvent("resume_data_updated", { detail: { resume: sample, lang: "id" } }))
      setCtaMessage({
        type: "success",
        text: isDemo
          ? job
            ? "Contoh CV dibuat dari lowongan ini (mode demo, tanpa API). Kamu akan diarahkan ke editor."
            : "Contoh CV dibuat dengan data contoh (mode demo). Kamu akan diarahkan ke editor."
          : hasApi
            ? "CV berhasil dibuat! Kamu akan diarahkan ke editor."
            : "Contoh CV dibuat dari lowongan ini (tanpa API). Kamu akan diarahkan ke editor.",
      })
      setTimeout(() => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" }), 600)
    } catch (err: any) {
      setCtaMessage({ type: "error", text: `Gagal: ${err?.message || "coba lagi"}` })
    } finally {
      setGeneratingFromJob(false)
    }
  }

  // Tombol "Coba Tanpa API Key (Mode Demo)" di kartu error: bangun CV contoh
  // tanpa API dari data lowongan yang tersedia (hasil analisis di state,
  // lowongan tersimpan, atau null). Jalur destruktif yang sama: bila CV sudah
  // berisi, modal konfirmasi tetap muncul dulu.
  const handleDemoBuild = async () => {
    if (generatingFromJob) return
    if (storedResumeHasContent()) {
      setShowReplaceConfirm(true)
      return
    }
    await performBuildResume(result ?? readStoredJob())
  }

  return (
    <section id="job-analyzer" className="py-24 relative">
      {showReplaceConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[overlay-in_.2s_ease-out]"
          onClick={() => setShowReplaceConfirm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 animate-[modal-in_.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowReplaceConfirm(false)}
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
                <h3 className="font-bold">Ganti isi CV kamu?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Generate Sample CV akan menimpa semua data CV yang sudah kamu isi. Data saat ini dibackup otomatis dan bisa diurungkan lewat tombol &quot;Urungkan generate terakhir&quot; di editor.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowReplaceConfirm(false)}>
                Batal
              </Button>
              <Button className="flex-1 gap-2" onClick={() => (result ? performBuildResume() : performBuildResume(readStoredJob()))} disabled={generatingFromJob}>
                <Wand2 className="w-4 h-4" />
                Generate &amp; Ganti
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

      <div className="container relative max-w-4xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary text-white shadow-xl">
              <Link2 className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Analisis{" "}
            <span className="text-primary">
              Lowongan Kerja
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tempel URL lowongan dari LinkedIn, JobStreet, Glints, atau website perusahaan.
            Persyaratannya terurai otomatis, mulai dari yang critical, important, sampai nice-to-have.
          </p>
        </div>

        <Card className="border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="w-5 h-5 text-primary" />
              Input Lowongan
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setInputMode("url")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  inputMode === "url"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <Link2 className="w-3 h-3 inline mr-1" />
                URL
              </button>
              <button
                onClick={() => setInputMode("paste")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  inputMode === "paste"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <ClipboardPaste className="w-3 h-3 inline mr-1" />
                Paste Teks
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {inputMode === "url" ? (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="https://linkedin.com/jobs/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  />
                </div>
                <Button onClick={handleAnalyze} disabled={!url.trim() || analyzing} className="gap-2">
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</>
                  ) : (
                    "Analisis"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="w-full min-h-[180px] rounded-xl border-2 border-border bg-background p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  placeholder={"Copy-paste deskripsi lowongan kerja di sini...\n\nContoh:\nPosition: Software Engineer\nCompany: PT Maju Jaya\nLocation: Jakarta\n\nRequirements:\n- 3+ years experience in React\n- Familiar with TypeScript\n..."}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <Button onClick={handleAnalyze} disabled={!pasteText.trim() || pasteText.trim().length < 10 || analyzing} className="w-full gap-2">
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis Teks...</>
                  ) : (
                    "Analisis Teks"
                  )}
                </Button>
              </div>
            )}
            {!hasApiKey ? (
              <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                API key belum dikonfigurasi. Isi di menu Konfigurasi API, lalu fitur ini otomatis siap dipakai.
              </p>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                API sudah dikonfigurasi. Fitur ini siap digunakan.
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card role="alert" className="border-red-500/30 bg-red-50/50 dark:bg-red-950/20 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  {error.startsWith(API_NOT_CONFIGURED_PREFIX) && (
                    <div className="mt-3 flex flex-col items-start gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDemoBuild}
                        disabled={generatingFromJob}
                        className="gap-2 border-amber-500/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        <Wand2 className="w-4 h-4" />
                        Coba Tanpa API Key (Mode Demo)
                      </Button>
                      <p className="text-xs text-muted-foreground">Hasil demo pakai contoh data, gratis tanpa kunci.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-border/50 mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                    {result.companyName}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Briefcase className="w-4 h-4" />
                    {result.position}
                    <span className="text-muted-foreground/50">|</span>
                    <MapPin className="w-4 h-4" />
                    {result.location || "Tidak disebutkan"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-white", sourceColors[result.source] || sourceColors.other)}>
                    {sourceNames[result.source] || "Other"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={handleCopyResult} title="Copy hasil">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    Langkah berikutnya
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Buat resume contoh yang langsung match dengan lowongan ini.
                  </p>
                </div>
                <Button onClick={handleBuildResume} disabled={generatingFromJob} className="gap-2 shrink-0">
                  {generatingFromJob ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : <><Wand2 className="w-4 h-4" /> Generate Sample CV</>}
                </Button>
              </div>
              {ctaMessage && (
                <div className={cn("text-xs rounded-lg p-3 border", ctaMessage.type === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800" : "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800")}>
                  {ctaMessage.text}
                </div>
              )}
              {result.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Deskripsi Pekerjaan</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.description}</p>
                </div>
              )}

              {result.keyRequirements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    Key Requirements
                  </h4>
                  <ul className="space-y-2">
                    {result.keyRequirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.preferredQualifications.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Preferred Qualifications</h4>
                  <ul className="space-y-2">
                    {result.preferredQualifications.map((pq, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                        {pq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.responsibilities.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Responsibilities</h4>
                  <ul className="space-y-2">
                    {result.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.educationRequirements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Persyaratan Pendidikan</h4>
                  <ul className="space-y-2">
                    {result.educationRequirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.benefits.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Benefits & Tunjangan</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.benefits.map((ben, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {ben}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.jobStreams.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3">Program / Jalur Karir</h4>
                  <div className="space-y-3">
                    {result.jobStreams.map((stream, i) => (
                      <details key={i} className="text-sm">
                        <summary className="font-medium cursor-pointer hover:text-primary transition-colors">
                          {stream.name}
                        </summary>
                        <div className="mt-2 ml-4 space-y-2">
                          {stream.description && (
                            <p className="text-muted-foreground">{stream.description}</p>
                          )}
                          {stream.preferredBackgrounds.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Latar belakang diutamakan: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {stream.preferredBackgrounds.map((bg, j) => (
                                  <Badge key={j} variant="outline" className="text-[10px]">
                                    {bg}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-primary/5 rounded-xl p-4">
                <p className="text-xs text-muted-foreground">
                  Hasil analisis tersimpan dan bisa digunakan di fitur ATS Optimizer. Data hanya disimpan di browser lokal.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && rawText && (
          <div className="mb-8">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <svg className={`w-3 h-3 transition-transform ${showRawText ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              {showRawText ? "Sembunyikan" : "Lihat"} teks sumber
              <span className="text-[10px] text-muted-foreground/50">{rawText.length} karakter</span>
            </button>
            {showRawText && (
              <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 border border-border/50 rounded-xl p-4 max-h-[400px] overflow-y-auto">{rawText}</pre>
            )}
          </div>
        )}

        {keyPoints && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="w-5 h-5 text-amber-500" />
                Key Points yang Dibutuhkan
              </CardTitle>
              <CardDescription>
                Sesuaikan resumemu agar match dengan key point berikut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {keyPoints.critical.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">WAJIB</Badge>
                    Critical Requirements
                  </h4>
                  <div className="space-y-3">
                    {keyPoints.critical.map((point, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                        <Progress value={100} className="w-1 h-8" variant="danger" />
                        <span className="text-sm font-medium">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {keyPoints.important.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">PENTING</Badge>
                    Important Requirements
                  </h4>
                  <div className="space-y-3">
                    {keyPoints.important.map((point, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                        <Progress value={75} className="w-1 h-8" variant="warning" />
                        <span className="text-sm">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {keyPoints.niceToHave.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NILAI TAMBAH</Badge>
                    Nice to Have
                  </h4>
                  <div className="space-y-3">
                    {keyPoints.niceToHave.map((point, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        <Progress value={40} className="w-1 h-8" />
                        <span className="text-sm text-muted-foreground">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
