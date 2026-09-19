import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Hero } from "@/components/features/hero"
import { Features } from "@/components/features/features"
import { HowItWorks } from "@/components/features/how-it-works"
import dynamic from "next/dynamic"

const Templates = dynamic(() => import("@/components/features/templates").then(m => ({ default: m.Templates })))
const JobAnalyzer = dynamic(() => import("@/components/features/job-analyzer").then(m => ({ default: m.JobAnalyzer })))
const ApiSettings = dynamic(() => import("@/components/features/api-settings").then(m => ({ default: m.ApiSettings })))
const ResumeBuilder = dynamic(() => import("@/components/features/resume-builder").then(m => ({ default: m.ResumeBuilder })))
const AtsOptimizer = dynamic(() => import("@/components/features/ats-optimizer").then(m => ({ default: m.AtsOptimizer })))
const Pricing = dynamic(() => import("@/components/features/pricing").then(m => ({ default: m.Pricing })))

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
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
