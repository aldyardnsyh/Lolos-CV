import { ImageResponse } from "next/og"
import { OgImageContent } from "@/components/seo/og-image"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Contoh CV ATS-Friendly Gratis dari LolosCV"

export default function Image() {
  return new ImageResponse(
    (
      <OgImageContent
        title="Contoh CV ATS-Friendly Gratis"
        subtitle="Per profesi: admin, fresh graduate, logistics, marketing"
        badge="Bisa Dicopy"
      />
    ),
    { ...size }
  )
}
