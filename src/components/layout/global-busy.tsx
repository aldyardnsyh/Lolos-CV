"use client"

import { Loader2 } from "lucide-react"
import { useGlobalBusy } from "@/lib/busy"

// Indikator global: bar progres di puncak viewport + pil status beranimasi.
// Muncul setiap ada proses panjang (generate, download, translate, analisis)
// agar user selalu tahu app sedang bekerja, bukan macet.
export function GlobalBusyBar() {
  const labels = useGlobalBusy()
  if (labels.length === 0) return null
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[110] h-1 overflow-hidden bg-primary/10" aria-hidden>
        <div className="h-full w-1/3 rounded-full bg-primary animate-[busy-slide_1.1s_ease-in-out_infinite]" />
      </div>
      <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-[95] flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-xl text-xs font-medium whitespace-nowrap max-w-[90vw]">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
        <span className="truncate">{labels[labels.length - 1]}</span>
      </div>
    </>
  )
}
