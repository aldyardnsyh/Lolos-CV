import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Hero } from "@/components/features/hero"
import { Features } from "@/components/features/features"
import { HowItWorks } from "@/components/features/how-it-works"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"

// Skeleton CWV: tampil selama chunk section dimuat agar layout tidak lompat
// (CLS) dan konten utama tetap prioritas render (docs/seo-plan-2026-11.md S2).
function SectionSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="py-24" aria-hidden="true">
      <div className="container max-w-4xl space-y-6">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-muted" />
        <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="mx-auto h-4 w-80 animate-pulse rounded bg-muted" />
        <div className={cn("w-full animate-pulse rounded-2xl border border-border/50 bg-muted/40", height)} />
      </div>
    </div>
  )
}

const Templates = dynamic(() => import("@/components/features/templates").then(m => ({ default: m.Templates })), { loading: () => <SectionSkeleton height="h-56" /> })
const JobAnalyzer = dynamic(() => import("@/components/features/job-analyzer").then(m => ({ default: m.JobAnalyzer })), { loading: () => <SectionSkeleton height="h-64" /> })
const ApiSettings = dynamic(() => import("@/components/features/api-settings").then(m => ({ default: m.ApiSettings })), { loading: () => <SectionSkeleton height="h-48" /> })
const ResumeBuilder = dynamic(() => import("@/components/features/resume-builder").then(m => ({ default: m.ResumeBuilder })), { loading: () => <SectionSkeleton height="h-96" /> })
const AtsOptimizer = dynamic(() => import("@/components/features/ats-optimizer").then(m => ({ default: m.AtsOptimizer })), { loading: () => <SectionSkeleton height="h-72" /> })
const CoverLetter = dynamic(() => import("@/components/features/cover-letter").then(m => ({ default: m.CoverLetter })), { loading: () => <SectionSkeleton height="h-72" /> })
const Pricing = dynamic(() => import("@/components/features/pricing").then(m => ({ default: m.Pricing })), { loading: () => <SectionSkeleton height="h-64" /> })

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Templates />
        <ApiSettings />
        <JobAnalyzer />
        <ResumeBuilder />
        <AtsOptimizer />
        <CoverLetter />
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
