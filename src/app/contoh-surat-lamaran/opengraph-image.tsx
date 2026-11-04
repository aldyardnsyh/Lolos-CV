import { ImageResponse } from "next/og"
import { OgImageContent } from "@/components/seo/og-image"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Contoh Surat Lamaran Kerja Format Indonesia dari LolosCV"

export default function Image() {
  return new ImageResponse(
    (
      <OgImageContent
        title="Contoh Surat Lamaran Kerja"
        subtitle="Siap copy, format Indonesia"
        badge="Gratis"
      />
    ),
    { ...size }
  )
}
