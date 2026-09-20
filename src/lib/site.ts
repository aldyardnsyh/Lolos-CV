// URL publik kanonis. Override via env bila pakai custom domain:
// NEXT_PUBLIC_SITE_URL=https://domain-kamu.com
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://loloscvats.vercel.app"
).replace(/\/$/, "")
