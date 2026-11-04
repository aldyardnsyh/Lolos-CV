"use client"

import { useState, useCallback, useEffect } from "react"
import {
  BarChart3, Loader2, CheckCircle2, XCircle, Lightbulb, TrendingUp, AlertTriangle, CloudOff, Wand2, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { analyzeATS, getApiConfig, normalizeResumeData, optimizeResumeContent, safeLocalGet, safeLocalSet } from "@/lib/api"
import { buildExclusionTerms, extractMeaningfulTokens } from "@/lib/keywords"
import type { ResumeData, JobPosting, ATSAnalysis, KeyPoint } from "@/types"

// Keyword mode demo bila tidak ada lowongan tersimpan: administrasi umum
// untuk pasar lamaran lokal, bukan keyword IT lama (Docker, Kubernetes, dst).
const DEMO_ADMIN_KEYWORDS = ["Microsoft Excel", "Administrasi", "Komunikasi", "Microsoft Word", "Data Entry"]

function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.map((x) => String(x ?? "").trim()).filter(Boolean)
    : []
}

// Lowongan tersimpan (ditulis job-analyzer saat analisis sukses) sebagai
// sumber keyword mode demo.
function readStoredJobAnalysis(): JobPosting | null {
  try {
    const raw = safeLocalGet("job_analysis")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as JobPosting) : null
  } catch {
    return null
  }
}

// Distribusi importance realistis (audit: jangan semua badge "WAJIB"):
// 3 pertama critical, sisanya bergantian important / nice-to-have.
function demoImportance(i: number): KeyPoint["importance"] {
  if (i < 3) return "critical"
  return i % 2 === 1 ? "important" : "nice-to-have"
}

// Skor demo mode tanpa API. Bukan hasil analisis CV user: keyword diambil dari
// lowongan tersimpan bila ada, kalau tidak dari keyword administrasi umum.
// Selalu ditampilkan bersama banner disclaimer yang jelas.
function buildDemoScores(job: JobPosting | null): ATSAnalysis {
  const jobKw = [
    ...strList(job?.keyRequirements),
    ...strList(job?.preferredQualifications),
  ]
  const keywords = Array.from(new Set(jobKw.length > 0 ? jobKw : DEMO_ADMIN_KEYWORDS)).slice(0, 8)
  const cut = Math.max(1, Math.min(5, Math.round(keywords.length * 0.6)))
  const matchedKeywords = keywords.slice(0, cut)
  const missingKeywords = keywords.slice(cut)
  return {
    overallScore: 68,
    keywordMatch: 64,
    formatScore: 85,
    sectionScore: 75,
    lengthScore: 60,
    matchedKeywords,
    missingKeywords,
    suggestions: [
      missingKeywords.length > 0
        ? `Tambahkan kata kunci yang diminta lowongan: ${missingKeywords.slice(0, 4).join(", ")}`
        : "Perkuat kata kunci lowongan di ringkasan dan deskripsi pengalaman",
      "Perkuat bagian pengalaman dengan metrik dan hasil konkret (angka, persentase)",
      "Gunakan action verbs yang lebih kuat: 'Mengelola', 'Menginisiasi', 'Mengoptimalkan'",
      "Pastikan format konsisten (font, spacing, bullet points) agar mudah dibaca ATS",
    ],
    keyPoints: keywords.map((text, i) => {
      const matched = i % 3 !== 2
      return {
        text,
        importance: demoImportance(i),
        matched,
        matchScore: matched ? 72 + ((i * 7) % 21) : 10 + ((i * 11) % 15),
      }
    }),
  }
}

function generateMockAnalysis(resume: ResumeData, jobPosting: JobPosting): ATSAnalysis {
  let host = ""
  try { host = jobPosting.url ? new URL(jobPosting.url).hostname : "" } catch {}
  const exclude = buildExclusionTerms(jobPosting.companyName, jobPosting.location, host)

  const safeArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
  const resumeText = [
    resume?.personalInfo?.fullName ?? "",
    resume?.summary ?? "",
    ...safeArr<any>(resume?.experiences).map((e) => `${e?.position ?? ""} ${e?.company ?? ""} ${e?.description ?? ""}`),
    ...safeArr<any>((resume as any)?.organizations).map((o: any) => `${o?.position ?? ""} ${o?.organization ?? ""} ${o?.description ?? ""}`),
    ...safeArr<any>(resume?.education).map((e) => `${e?.degree ?? ""} ${e?.field ?? ""} ${e?.institution ?? ""}`),
    ...safeArr<any>((resume as any)?.research).map((x) => `${x?.title ?? ""} ${x?.status ?? ""} ${x?.organization ?? ""} ${x?.description ?? ""}`),
    ...safeArr<any>(resume?.skills).map((s) => `${s?.name ?? ""} ${s?.level ?? ""}`),
    ...safeArr<any>((resume as any)?.skillGroups).flatMap((g: any) => [g?.title ?? "", ...safeArr(g?.items)]),
    ...safeArr(resume?.certifications),
    ...safeArr<any>((resume as any)?.awards).map((a) => typeof a === "string" ? a : `${a?.title ?? ""} ${a?.organizer ?? ""} ${a?.year ?? ""}`),
    ...safeArr((resume as any)?.awards),
    ...safeArr(resume?.languages),
  ].join(" ")
  const resumeTokens = new Set(extractMeaningfulTokens(resumeText))

  const jobText = [
    jobPosting?.position ?? "",
    jobPosting?.description ?? "",
    ...safeArr(jobPosting?.keyRequirements),
    ...safeArr(jobPosting?.preferredQualifications),
    ...safeArr(jobPosting?.responsibilities),
  ].join(" ")
  const jobTokens = extractMeaningfulTokens(jobText, exclude)

  const matched = jobTokens.filter((w) => resumeTokens.has(w))
  const missing = jobTokens.filter((w) => !resumeTokens.has(w))

  const matchRate = jobTokens.length > 0 ? Math.round((matched.length / jobTokens.length) * 100) : 50
  const experiences = safeArr<any>(resume?.experiences)
  const totalSections = [resume?.summary, ...experiences.map((e) => e?.description), ...safeArr<any>(resume?.education).map((e) => e?.degree)].filter(Boolean).length

  const scoreRequirement = (req: string) => {
    const tokens = extractMeaningfulTokens(req, exclude)
    if (tokens.length === 0) return { hit: false, score: 0 }
    const hits = tokens.filter((t) => resumeTokens.has(t)).length
    const ratio = Math.round((hits / tokens.length) * 100)
    return { hit: ratio >= 50, score: ratio }
  }

  return {
    overallScore: Math.min(95, 40 + matchRate * 0.4 + totalSections * 5),
    keywordMatch: Math.min(100, matchRate),
    formatScore: 75 + (experiences.length > 0 ? 15 : 0),
    sectionScore: Math.min(100, totalSections * 15),
    lengthScore: Math.min(100, 50 + matched.length * 2),
    matchedKeywords: matched.slice(0, 12),
    missingKeywords: missing.slice(0, 12),
    suggestions: [
      missing.length > 0 ? `Tambahkan kata kunci relevan: ${missing.slice(0, 6).join(", ")}` : "Semua kata kunci utama sudah tercakup!",
      totalSections < 3 ? "Tambahkan lebih banyak detail pengalaman dan pendidikan" : "Struktur CV sudah baik, tingkatkan kualitas deskripsi",
      "Gunakan angka dan metrik dalam deskripsi pengalaman",
      "Pastikan format konsisten (font, spacing, bullet points)",
    ],
    keyPoints: safeArr<string>(jobPosting?.keyRequirements).slice(0, 8).map((req, i) => {
      const { hit, score } = scoreRequirement(req)
      return {
        text: req,
        // Distribusi realistis, bukan semua "WAJIB" (audit: mendorong
        // keyword-stuffing).
        importance: demoImportance(i),
        matched: hit,
        matchScore: score,
      }
    }),
  }
}

// Pagar data-loss: cek raw string "resume_data" apakah benar-benar berisi CV
// (autosave builder selalu menulis object, jadi cek isinya, bukan keberadaannya).
function resumeRawHasContent(raw: string): boolean {
  try {
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

export function AtsOptimizer() {
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ATSAnalysis | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [changes, setChanges] = useState<string[]>([])
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)

  useEffect(() => {
    const check = () => setHasApiKey(!!getApiConfig())
    check()
    window.addEventListener("api_config_changed", check)
    return () => window.removeEventListener("api_config_changed", check)
  }, [])

  // Optimasi bersifat destruktif bila CV user sudah terisi → minta konfirmasi
  // dulu (sama seperti jalur generate di dalam builder).
  const handleOptimize = async () => {
    const config = getApiConfig()
    if (!config) return

    const storedResume = safeLocalGet("resume_data")
    const storedJob = safeLocalGet("job_analysis")
    if (!storedResume || !storedJob) return

    if (resumeRawHasContent(storedResume)) {
      setShowReplaceConfirm(true)
      return
    }
    await performOptimize(storedResume, storedJob)
  }

  const performOptimize = async (storedResume: string, storedJob: string) => {
    setOptimizing(true)
    setShowReplaceConfirm(false)
    setError(null)
    try {
      const resume: ResumeData = normalizeResumeData(JSON.parse(storedResume))
      const job: JobPosting = JSON.parse(storedJob)
      const missingKw = result?.missingKeywords || []
      // Backup "sebelum" ditulis dulu ke key yang SAMA dengan tombol
      // "Urungkan generate terakhir" di builder; resume_data baru ditimpa
      // hanya jika optimasi sukses.
      safeLocalSet("resume_data_before_generate", storedResume)

      const { optimized: optimizedResume, changes: appliedChanges } = await optimizeResumeContent(resume, job, missingKw, "id")
      safeLocalSet("resume_data", JSON.stringify(optimizedResume))
      window.dispatchEvent(new CustomEvent("resume_data_updated", { detail: { resume: optimizedResume, lang: "id" } }))
      setChanges(appliedChanges)

      try {
        const newAnalysis = await analyzeATS(optimizedResume, job, "id")
        setResult(newAnalysis)
      } catch {
        // Analisis ulang gagal: optimasi tetap sah, skor lama dipertahankan
      }
      setOptimized(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setOptimizing(false)
    }
  }

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    setResult(null)
    setError(null)
    setIsDemo(false)
    setOptimized(false)
    setChanges([])

    const config = getApiConfig()
    if (!config) {
      setError("API belum dikonfigurasi. Menampilkan hasil demo.")
      setIsDemo(true)
      await new Promise((r) => setTimeout(r, 1500))
      setResult(buildDemoScores(readStoredJobAnalysis()))
      setAnalyzing(false)
      return
    }

    const storedResume = safeLocalGet("resume_data")
    const storedJob = safeLocalGet("job_analysis")

    if (storedResume && storedJob) {
      // Normalisasi dulu: data lama/tidak lengkap (array hilang, bentuk beda)
      // bikin mock-analysis throw → hasil blank. Dengan normalisasi, analisis
      // SELALU menghasilkan sesuatu (real atau deterministik lokal).
      let resume: ResumeData
      let job: JobPosting
      try {
        resume = normalizeResumeData(JSON.parse(storedResume))
        job = JSON.parse(storedJob)
      } catch (err: any) {
        setIsDemo(true)
        setError("Data tersimpan korup dan tidak bisa dibaca. Isi ulang resume/lowongan lalu coba lagi.")
        await new Promise((r) => setTimeout(r, 800))
        setResult(buildDemoScores(readStoredJobAnalysis()))
        setAnalyzing(false)
        return
      }
      try {
        const analysis = await analyzeATS(resume, job)
        setResult(analysis)
      } catch (err: any) {
        setIsDemo(true)
        setError(err?.message || "Analisis gagal. Menampilkan hasil simulasi.")
        try {
          setResult(generateMockAnalysis(resume, job))
        } catch {
          setResult(buildDemoScores(readStoredJobAnalysis()))
        }
      }
    } else {
      setIsDemo(true)
      await new Promise((r) => setTimeout(r, 1500))
      setResult(buildDemoScores(readStoredJobAnalysis()))
    }

    setAnalyzing(false)
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-amber-500"
    return "text-red-500"
  }

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "success" as const
    if (score >= 60) return "warning" as const
    return "danger" as const
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Needs Work"
    return "Poor"
  }

  return (
    <section id="ats-optimizer" className="py-24">
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
                  Optimasi akan mengganti isi CV dengan versi hasil optimasi. Data saat ini dibackup otomatis dan bisa diurungkan lewat tombol &quot;Urungkan generate terakhir&quot; di editor.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowReplaceConfirm(false)}>
                Batal
              </Button>
              <Button className="flex-1 gap-2" onClick={() => {
                const storedResume = safeLocalGet("resume_data")
                const storedJob = safeLocalGet("job_analysis")
                if (storedResume && storedJob) performOptimize(storedResume, storedJob)
              }} disabled={optimizing}>
                <Wand2 className="w-4 h-4" />
                Generate &amp; Ganti
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="container max-w-4xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary text-white shadow-xl">
              <BarChart3 className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Optimasi{" "}
            <span className="text-primary">
              Skor ATS
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Analisis dan optimasi CV kamu agar lolos seleksi ATS.
            {!hasApiKey && " (Contoh hasil, hubungkan API untuk skor real)"}
          </p>
        </div>

        <Card className="border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              ATS Score Check
            </CardTitle>
            <CardDescription>
              {hasApiKey
                ? "Analisis memakai data CV dan lowongan yang sudah kamu buat"
                : "Sedang melihat contoh hasil. Hubungkan API untuk skor data kamu sendiri"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAnalyze} disabled={analyzing} size="lg" className="gap-2">
              {analyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Menganalisis...</>
              ) : (
                <><BarChart3 className="w-5 h-5" /> {result ? "Analisis Ulang" : "Analisis Skor ATS"}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card role="alert" className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CloudOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{error}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Hasil di bawah adalah simulasi. Untuk hasil real, konfigurasi API key dan isi data resume + lowongan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isDemo && result && (
          <div
            role="note"
            className="mb-6 rounded-2xl border-2 border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Ini contoh hasil dengan data lain, bukan skor CV-mu.
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  Hubungkan Mesin AI untuk skor sesuai lowonganmu.
                </p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="w-5 h-5 text-amber-500" />Saran Optimasi</CardTitle>
              </CardHeader>
              <CardContent>
                {optimizing ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-center">Mengoptimasi CV-mu...</p>
            <p className="text-xs text-muted-foreground text-center">Memperbaiki copywriting tanpa mengubah data aslimu</p>
                  </div>
                ) : (
                  <>
                    {optimized && changes.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-sm font-medium">Optimasi selesai. Perubahan yang diterapkan:</span>
                        </div>
                        <div className="space-y-2">
                          {changes.map((change, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-sm">{change}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          Data pengalaman asli kamu dipertahankan. Skor ATS terbaru ada di atas.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {result.suggestions.map((suggestion, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-sm">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    )}
                      {hasApiKey && !optimized && (
                        <div className="mt-4">
                          <Button onClick={handleOptimize} disabled={optimizing} className="w-full gap-2">
                            {optimizing ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Mengoptimasi...</>
                            ) : (
                              <><TrendingUp className="w-4 h-4" /> Optimasi Resume</>
                            )}
                          </Button>
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Detail Key Point Matching</CardTitle>
                <CardDescription>Seberapa baik resumemu mencakup setiap key point yang dibutuhkan</CardDescription>
              </CardHeader>
              <CardContent>
                {optimizing ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-center">Menganalisis ulang key points...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {result.keyPoints.map((kp, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {kp.matched ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="text-sm">{kp.text}</span>
                          </div>
                          <Badge variant={kp.importance === "critical" ? "destructive" : kp.importance === "important" ? "warning" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {kp.importance === "critical" ? "WAJIB" : kp.importance === "important" ? "PENTING" : "NILAI TAMBAH"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={kp.matchScore} variant={getScoreVariant(kp.matchScore)} className="flex-1" />
                          <span className={cn("text-xs font-medium w-8 text-right", getScoreColor(kp.matchScore))}>{Math.round(kp.matchScore)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Keywords Terdeteksi</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedKeywords.map((kw) => (
                      <Badge key={kw} variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" />{kw}</Badge>
                    ))}
                    {result.matchedKeywords.length === 0 && <span className="text-sm text-muted-foreground">Belum ada keyword terdeteksi</span>}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><XCircle className="w-4 h-4 text-red-500" />Keywords Hilang</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw) => (
                      <Badge key={kw} variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />{kw}</Badge>
                    ))}
                    {result.missingKeywords.length === 0 && <span className="text-sm text-muted-foreground">Semua keyword tercakup!</span>}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </section>
  )
}
