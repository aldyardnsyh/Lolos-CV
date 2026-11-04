// Komponen bersama untuk OG image: dipakai opengraph-image.tsx root dan
// og-image per halaman konten. Semua style inline literal statis (next/og
// menuntut style tanpa template string dinamis).
export function OgImageContent({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle: string
  badge?: string
}) {
  return (
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
        {title}
      </div>
      <div style={{ fontSize: 40, marginTop: 16, opacity: 0.92, lineHeight: 1.3 }}>
        {subtitle}
      </div>
      {badge ? (
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
            {badge}
          </div>
        </div>
      ) : null}
    </div>
  )
}
