import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"
import { SEO_PAGES, seoPageUrl } from "@/lib/seo/pages"

// Sitemap dibangun dari registry src/lib/seo/pages.ts dengan lastmod stabil.
export default function sitemap(): MetadataRoute.Sitemap {
  return SEO_PAGES.map((page) => ({
    url: seoPageUrl(page.slug, SITE_URL),
    lastModified: page.lastmod,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
