import { ImageResponse } from "next/og"
import { OgImageContent } from "@/components/seo/og-image"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// OG image statis (tanpa fetch font eksternal): judul + tagline + penegas gratis.
export default function Image() {
  return new ImageResponse(
    (
      <OgImageContent
        title="LolosCV"
        subtitle="CV ATS-Friendly gratis, tanpa akun, tanpa watermark."
        badge="Gratis Rp 0"
      />
    ),
    { ...size }
  )
}
