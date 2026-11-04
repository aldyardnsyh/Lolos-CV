import { ImageResponse } from "next/og"
import { OgImageContent } from "@/components/seo/og-image"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "4 Template CV ATS-Friendly Gratis dari LolosCV"

export default function Image() {
  return new ImageResponse(
    (
      <OgImageContent
        title="4 Template CV ATS-Friendly Gratis"
        subtitle="ATS Classic, ATS + Foto, Creative, Modern Minimal"
        badge="Rp 0"
      />
    ),
    { ...size }
  )
}
