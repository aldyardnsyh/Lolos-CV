// URL publik kanonis. Override via env bila pakai custom domain:
// NEXT_PUBLIC_SITE_URL=https://www.loloscvats.web.id
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.loloscvats.web.id"
).replace(/\/$/, "")
