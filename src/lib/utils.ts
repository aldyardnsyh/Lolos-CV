import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date)
}

export function formatResumeDate(dateStr: string): string {
  if (!dateStr) return ""
  // Already formatted: "Jan 2024", "Present", "Sekarang", "2026 (expected)"
  if (/^[A-Z][a-z]{2}\s+\d{4}/.test(dateStr)) return dateStr
  if (/^(Present|Sekarang|Now)$/i.test(dateStr)) return dateStr
  // "2024-01" or "2024-1"
  const m = dateStr.match(/^(\d{4})-(\d{1,2})$/)
  if (m) {
    const month = parseInt(m[2], 10)
    if (month >= 1 && month <= 12) return `${MONTH_NAMES[month - 1]} ${m[1]}`
  }
  // "2024" alone
  if (/^\d{4}$/.test(dateStr)) return dateStr
  return dateStr
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

// Only allow safe image data URLs for profile photos. Blocks devtools-injected
// javascript:, data:text/html, or blob: URIs that could run code or track.
export function isSafePhotoSrc(src: string | undefined): src is string {
  if (!src) return false
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/.test(src)) return true
  if (/^https:\/\/(res\.cloudinary\.com|images\.unsplash\.com|avatars\.githubusercontent\.com|gravatar\.com|ui-avatars\.com)/.test(src)) return true
  return false
}
