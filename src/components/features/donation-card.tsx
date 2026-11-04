"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Heart, Copy, CheckCircle2, ExternalLink, QrCode } from "lucide-react"

const SAWERIA_URL = "https://saweria.co/pogungsoftwarehouse"
const SAWERIA_USERNAME = "pogungsoftwarehouse"
const QRIS_IMAGE = "/qris-donasi.png"

// Nama ini diambil dari tag 59 payload QRIS (EMVCo), yaitu nama yang benar-benar
// tampil di aplikasi pembayaran donatur. Bukan teks yang tercetak di kartu.
const QRIS_MERCHANT = "Bangun Resume ID, Digital"
const QRIS_NMID = "ID10265622222962"

const METHOD_KEY = "donation_method"

type Method = "saweria" | "qris"

interface DonationCardProps {
  compact?: boolean
  lang?: "id" | "en"
  onDone?: () => void
}

export function DonationCard({ compact = false, lang = "id", onDone }: DonationCardProps) {
  const [method, setMethod] = useState<Method>("saweria")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(METHOD_KEY)
      if (saved === "qris" || saved === "saweria") setMethod(saved)
    } catch {}
  }, [])

  const pickMethod = (next: Method) => {
    setMethod(next)
    try {
      window.localStorage.setItem(METHOD_KEY, next)
    } catch {}
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SAWERIA_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const flipped = method === "qris"
  const isEn = lang === "en"

  const qrSize = compact ? 180 : 200
  const faceBase = compact ? "p-4 min-h-[286px]" : "p-5 min-h-[330px]"

  return (
    <div>
      {/* Saklar metode donasi */}
      <div
        role="group"
        aria-label={isEn ? "Choose donation method" : "Pilih metode donasi"}
        className="relative grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 mb-4"
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-card shadow-sm ring-1 ring-border transition-transform duration-300 ${
            flipped ? "translate-x-full" : "translate-x-0"
          }`}
        />
        <button
          type="button"
          onClick={() => pickMethod("saweria")}
          aria-pressed={!flipped}
          aria-controls="donation-face-saweria"
          className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
            !flipped ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          Saweria
        </button>
        <button
          type="button"
          onClick={() => pickMethod("qris")}
          aria-pressed={flipped}
          aria-controls="donation-face-qris"
          className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
            flipped ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          QRIS
        </button>
      </div>

      {/* Kartu flip: kedua sisi ditumpuk di sel grid yang sama, jadi tinggi
          kartu mengikuti sisi yang paling tinggi dan tidak melompat saat flip. */}
      <div className="[perspective:1400px]">
        <div
          className={`grid transition-transform duration-500 ease-out [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* Sisi depan: Saweria */}
          <div
            id="donation-face-saweria"
            aria-hidden={flipped}
            className={`[grid-area:1/1] flex flex-col justify-center rounded-xl border border-border bg-card [backface-visibility:hidden] ${faceBase} ${
              flipped ? "pointer-events-none" : ""
            }`}
          >
            <p className="text-sm font-semibold">
              {isEn ? "Support via Saweria" : "Dukung lewat Saweria"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {isEn
                ? "GoPay, OVO, DANA, ShopeePay, or bank transfer. Your name appears on the leaderboard automatically."
                : "GoPay, OVO, DANA, ShopeePay, atau transfer bank. Namamu otomatis tampil di leaderboard setelah pembayaran terkonfirmasi."}
            </p>

            <a
              href={SAWERIA_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={flipped ? -1 : 0}
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              <Heart className="w-4 h-4" />
              {isEn ? "Open Saweria" : "Buka Saweria"}
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <div className="mt-3">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                {isEn ? "Saweria username" : "Username Saweria"}
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5">
                <span className="text-xs font-medium truncate">{SAWERIA_USERNAME}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  tabIndex={flipped ? -1 : 0}
                  className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                  aria-label={isEn ? "Copy Saweria link" : "Salin link Saweria"}
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sisi belakang: QRIS */}
          <div
            id="donation-face-qris"
            aria-hidden={!flipped}
            className={`[grid-area:1/1] flex flex-col justify-center rounded-xl border border-border bg-card [backface-visibility:hidden] [transform:rotateY(180deg)] ${faceBase} ${
              flipped ? "" : "pointer-events-none"
            }`}
          >
            <p className="text-sm font-semibold text-center">
              {isEn ? "Scan this QRIS code" : "Scan kode QRIS ini"}
            </p>
            <Image
              src={QRIS_IMAGE}
              alt={
                isEn
                  ? "QRIS code for donating to the LolosCV developer"
                  : "Kode QRIS untuk donasi ke pengembang LolosCV"
              }
              width={1024}
              height={1024}
              sizes={`${qrSize}px`}
              className="mx-auto mt-2 h-auto rounded-lg bg-white p-1.5"
              style={{ width: qrSize, height: qrSize }}
            />
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed text-center">
              {isEn
                ? "Scan with any QRIS-enabled banking or e-wallet app. Any amount, no minimum."
                : "Scan pakai m-banking atau e-wallet yang mendukung QRIS. Nominal bebas, tanpa minimum."}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-center text-muted-foreground">
              {isEn ? "Merchant name shown in your app: " : "Nama merchant di aplikasi pembayaranmu: "}
              <span className="font-medium text-foreground">{QRIS_MERCHANT}</span>
            </p>
            <a
              href={QRIS_IMAGE}
              download="qris-bangun-resume-id.png"
              tabIndex={flipped ? 0 : -1}
              onClick={onDone}
              className="mt-2 mx-auto flex items-center justify-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {isEn ? "Download QRIS image" : "Unduh gambar QRIS"}
            </a>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed text-center">
        {isEn
          ? `Saweria payments update the leaderboard automatically. QRIS payments are recorded manually (NMID ${QRIS_NMID}).`
          : `Donasi Saweria masuk leaderboard otomatis. Donasi QRIS dicatat manual oleh pengelola (NMID ${QRIS_NMID}).`}
      </p>
    </div>
  )
}
