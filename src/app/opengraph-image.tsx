import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// OG image statis (tanpa fetch font eksternal): judul + tagline + penegas gratis.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#172c4f",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          Lolos<span style={{ color: "#7fb3ff" }}>CV</span>
        </div>
        <div style={{ fontSize: 40, marginTop: 16, opacity: 0.92, lineHeight: 1.3 }}>
          Buat CV yang lolos seleksi ATS, mengikuti lowongan target.
        </div>
        <div
          style={{
            marginTop: 36,
            display: "flex",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              backgroundColor: "#22c55e",
              borderRadius: 999,
              padding: "12px 32px",
            }}
          >
            Gratis untuk semua
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
