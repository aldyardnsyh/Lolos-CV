"use client"

import { useState, useCallback, useEffect } from "react"
import {
  BarChart3, Loader2, CheckCircle2, XCircle, Lightbulb, TrendingUp, AlertTriangle, CloudOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { analyzeATS, getApiConfig, normalizeResumeData, optimizeResumeContent, safeLocalGet, safeLocalSet } from "@/lib/api"
import { buildExclusionTerms, extractMeaningfulTokens } from "@/lib/keywords"
import type { ResumeData, JobPosting, ATSAnalysis } from "@/types"

const demoScores: ATSAnalysis = {
  overallScore: 72,
  keywordMatch: 65,
  formatScore: 88,
  sectionScore: 80,
  lengthScore: 55,
  matchedKeywords: ["React", "TypeScript", "Team Leadership", "Agile", "REST API", "Git", "CI/CD", "Problem Solving"],
  missingKeywords: ["Docker", "Microservices", "GraphQL", "Terraform", "Kubernetes", "System Design"],
  suggestions: [
    "Tambahkan kata kunci Docker dan Microservices yang diminta di lowongan",
    "Perkuat bagian pengalaman dengan metrik dan hasil konkret (angka, persentase)",
    "Tambahkan section tentang System Design jika relevan dengan posisi",
    "Optimalkan panjang CV agar tidak lebih dari 2 halaman (saat ini terlalu panjang)",
    "Gunakan action verbs yang lebih kuat: 'Memimpin', 'Menginisiasi', 'Mengoptimalkan'",
  ],
  keyPoints: [
    { text: "Pengalaman dengan React/Next.js minimal 3 tahun", importance: "critical", matched: true, matchScore: 90 },
    { text: "Memahami Microservices architecture", importance: "critical", matched: false, matchScore: 20 },
    { text: "Pengalaman dengan GraphQL", importance: "important", matched: false, matchScore: 0 },
    { text: "Pengalaman Docker & Kubernetes", importance: "important", matched: false, matchScore: 10 },
    { text: "Team leadership experience", importance: "critical", matched: true, matchScore: 85 },
    { text: "Pengalaman dengan CI/CD pipeline", importance: "important", matched: true, matchScore: 70 },
    { text: "Strong problem-solving skills", importance: "critical", matched: true, matchScore: 75 },
    { text: "Pengalaman System Design", importance: "nice-to-have", matched: false, matchScore: 15 },
  ],
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
    ...safeArr<any>((resume as any)?.research).map((x) => `${x?.title ?? ""} ${x?.organization ?? ""} ${x?.description ?? ""}`),
    ...safeArr<any>(resume?.skills).map((s) => `${s?.name ?? ""} ${s?.level ?? ""}`),
    ...safeArr<any>((resume as any)?.skillGroups).flatMap((g: any) => [g?.title ?? "", ...safeArr(g?.items)]),
    ...safeArr(resume?.certifications),
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
    keyPoints: safeArr<string>(jobPosting?.keyRequirements).slice(0, 8).map((req) => {
      const { hit, score } = scoreRequirement(req)
      return {
        text: req,
        importance: "critical" as const,
        matched: hit,
        matchScore: score,
      }
    }),
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

  useEffect(() => {
    const check = () => setHasApiKey(!!getApiConfig())
    check()
    window.addEventListener("api_config_changed", check)
    return () => window.removeEventListener("api_config_changed", check)
  }, [])

  const handleOptimize = async () => {
    const config = getApiConfig()
    if (!config) return

    const storedResume = safeLocalGet("resume_data")
    const storedJob = safeLocalGet("job_analysis")
    if (!storedResume || !storedJob) return

    setOptimizing(true)
    setError(null)
    try {
      const resume: ResumeData = normalizeResumeData(JSON.parse(storedResume))
      const job: JobPosting = JSON.parse(storedJob)
      const missingKw = result?.missingKeywords || []
      // Snapshot "sebelum" disimpan dulu; resume_data baru ditimpa hanya jika optimasi sukses
      safeLocalSet("resume_data_before_optimize", storedResume)

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
      setResult(demoScores)
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
        setResult(demoScores)
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
          setResult(demoScores)
        }
      }
    } else {
      setIsDemo(true)
      await new Promise((r) => setTimeout(r, 1500))
      setResult(demoScores)
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

        {isDemo && !error && (
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Mode Demo</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Hasil berdasarkan data simulasi. Untuk analisis akurat, buat resume dan analisis lowongan terlebih dahulu.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
