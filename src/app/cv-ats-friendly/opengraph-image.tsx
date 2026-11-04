import { ImageResponse } from "next/og"
import { OgImageContent } from "@/components/seo/og-image"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Panduan CV ATS-Friendly dalam bahasa awam dari LolosCV"

export default function Image() {
  return new ImageResponse(
    (
      <OgImageContent
        title="Panduan CV ATS-Friendly"
        subtitle="Apa itu ATS, checklist, do dan dont"
        badge="Bahasa Awam"
      />
    ),
    { ...size }
  )
}
