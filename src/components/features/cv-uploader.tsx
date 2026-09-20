"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { pushBusy } from "@/lib/busy"
import { extractResumeFromCvText } from "@/lib/api"
import type { ResumeData } from "@/types"

interface CVUploaderProps {
  onApply: (resume: ResumeData) => void
}

export function CVUploader({ onApply }: CVUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedData, setExtractedData] = useState<ResumeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Batas agar PDF raksasa tidak menggantung tab (pdfjs parse seluruh halaman).
  const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB
  const MAX_PDF_PAGES = 10

  const extractPdfText = async (file: File): Promise<string> => {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error("Ukuran PDF maksimal 10MB")
    }
    const arrayBuffer = await file.arrayBuffer()
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF maksimal ${MAX_PDF_PAGES} halaman`)
    }
    let fullText = ""
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(" ")
      fullText += pageText + "\n"
      setProgress(Math.round((i / pdf.numPages) * 100))
    }
    return fullText
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setExtractedData(null)
    setError(null)

    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Hanya file PDF yang didukung")
      return
    }

    setExtracting(true)
    setProgress(0)
    const doneBusyUpload = pushBusy("Mengekstrak teks PDF...")
    try {
      const text = await extractPdfText(f)
      if (!text.trim()) {
        setError("Tidak dapat mengekstrak teks dari PDF. Pastikan file bukan hasil scan/gambar.")
        doneBusyUpload(); setExtracting(false)
        return
      }
      const data = await extractResumeFromCvText(text)
      setExtractedData(data)
    } catch (err: any) {
      setError(err.message || "Gagal memproses file")
    } finally {
      doneBusyUpload(); setExtracting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const fieldCount = (data: ResumeData) => {
    let count = 0
    if (data.personalInfo.fullName) count++
    if (data.personalInfo.email) count++
    if (data.personalInfo.phone) count++
    if (data.personalInfo.location) count++
    if (data.summary) count++
    count += data.experiences.length
    count += data.education.length
    count += data.skills.length
    count += data.certifications.length
    count += data.languages.length
    return count
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {extracting ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Membaca file...</p>
            <Progress value={progress} className="h-1.5 max-w-xs mx-auto" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Upload className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium">
              {file ? file.name : "Upload CV (PDF)"}
            </p>
            <p className="text-xs text-muted-foreground">
              Seret file ke sini atau klik untuk memilih
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {extractedData && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Data berhasil diekstrak
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {fieldCount(extractedData)} field terisi dari CV
                </p>
              </div>
              <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <FileText className="w-3 h-3 mr-1" />
                {extractedData.experiences.length} Pengalaman
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {extractedData.personalInfo.fullName && (
                <div><span className="text-muted-foreground">Nama:</span> {extractedData.personalInfo.fullName}</div>
              )}
              {extractedData.personalInfo.email && (
                <div><span className="text-muted-foreground">Email:</span> {extractedData.personalInfo.email}</div>
              )}
              {extractedData.skills.length > 0 && (
                <div><span className="text-muted-foreground">Skill:</span> {extractedData.skills.map(s => s.name).join(", ")}</div>
              )}
              {extractedData.education.length > 0 && (
                <div><span className="text-muted-foreground">Pendidikan:</span> {extractedData.education.map(e => e.institution).join(", ")}</div>
              )}
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => onApply(extractedData)}
            >
              <Sparkles className="w-4 h-4" />
              Terapkan Data ke Builder
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
