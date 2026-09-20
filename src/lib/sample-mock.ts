"use client"

import type { JobPosting, ResumeData } from "@/types"

const GENERIC_BULLETS = [
  "Delivered 20+ tasks per quarter with 98% on-time rate",
  "Collaborated with a 6-person cross-functional team to exceed quarterly targets by 12%",
  "Cut manual reporting effort by 50% through process improvements",
  "Maintained documentation covering 30+ workflows for handover and audits",
]

// Grup skill default yang kaya — mencontohkan versi selengkap-lengkapnya:
// tiap kategori punya judul yang bisa diedit user langsung di editor.
const RICH_DEFAULT_GROUPS = [
  { id: "sg_1", title: "Programming Languages", items: ["JavaScript", "TypeScript", "C#", "PHP", "Go", "Python", "SQL"] },
  { id: "sg_2", title: "Frontend", items: ["React.js", "Next.js", "Vue.js", "Tailwind CSS", "SPA Development", "SSR", "PWA"] },
  { id: "sg_3", title: "Backend & APIs", items: ["Node.js", "Express.js", "Laravel", ".NET", "FastAPI", "RESTful API Development", "Microservices Architecture", "WebSockets", "Clean Architecture"] },
  { id: "sg_4", title: "AI & Integration", items: ["OpenAI API", "LLM Integration", "Natural-Language Analytics"] },
  { id: "sg_5", title: "Security & Auth", items: ["JWT", "OAuth", "RBAC", "Audit Logging"] },
  { id: "sg_6", title: "Databases", items: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch"] },
  { id: "sg_7", title: "DevOps & Cloud", items: ["Docker", "CI/CD (GitHub Actions, Jenkins)", "AWS (EC2, S3)", "Git"] },
]

function cleanList(items: unknown, limit: number): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, limit)
}

function isUnknownCompany(name: unknown): boolean {
  const v = typeof name === "string" ? name.trim().toLowerCase() : ""
  return !v || v === "unknown company"
}

// Contoh CV deterministik tanpa API — dibuat SELENGKAP mungkin agar user
// langsung tergambar versi paling penuh: 3 pengalaman, 2 organisasi,
// 2 pendidikan (dengan thesis+research multi-bullet), 6-7 grup skill,
// 3 proyek, 4-5 awards, 3 bahasa. Kalau ada data lowongan, grup pertama
// disesuaikan (posisi, perusahaan, skill, deskripsi) agar match.
export function buildMockSampleResume(job: JobPosting | null): ResumeData {
  const position = job?.position?.trim() && job.position !== "Unknown Position"
    ? job.position.trim()
    : "Software Engineer"
  const company = !isUnknownCompany(job?.companyName)
    ? String(job?.companyName).trim()
    : "PT Sample Maju Bersama"
  const location = job?.location?.trim() || "Jakarta, Indonesia"

  const jobSkills = cleanList(job?.keyRequirements, 5)
    .concat(cleanList(job?.preferredQualifications, 3))
    .slice(0, 8)
  const hasJobSkills = jobSkills.length > 0
  const skillGroups = hasJobSkills
    ? [
        { id: "sg_1", title: "Key Skills", items: jobSkills.slice(0, 5) },
        ...RICH_DEFAULT_GROUPS.slice(0, 4).map((g, i) => ({ ...g, id: `sg_${i + 2}` })),
      ]
    : RICH_DEFAULT_GROUPS.map((g) => ({ ...g }))
  const flatNames = skillGroups.flatMap((g) => g.items).slice(0, 10)
  const levels = ["advanced", "intermediate", "intermediate", "advanced", "intermediate", "beginner", "intermediate", "beginner", "advanced", "intermediate"] as const
  const skills = flatNames.map((name, i) => ({
    id: `sk_${i + 1}`,
    name,
    level: levels[i % levels.length],
  }))

  const resp = cleanList(job?.responsibilities, 4)
  const bullets = (resp.length > 0 ? resp : GENERIC_BULLETS).slice(0, 4)
  const techLine = (hasJobSkills ? jobSkills : RICH_DEFAULT_GROUPS[0].items).slice(0, 3).join(", ")

  return {
    personalInfo: {
      fullName: "Budi Santoso",
      headline: position,
      email: "budi.santoso@email.com",
      phone: "+62 812-3456-7890",
      location,
      linkedin: "linkedin.com/in/budisantoso",
      portfolio: "github.com/budisantoso",
      photo: "https://ui-avatars.com/api/?name=Budi+Santoso&size=256&background=1e3a5c&color=fff",
    },
    summary: `Results-driven ${position} with 5+ years of experience building scalable web platforms at ${company}, including ${techLine}. Proven track record of leading small teams, shipping reliable releases with CI/CD, and turning ambiguous requirements into measurable outcomes. Active in tech communities and comfortable collaborating across product, design, and data teams.`,
    experiences: [
      {
        id: "exp_1",
        company,
        position: `Senior ${position}`,
        location,
        startDate: "2022-06",
        endDate: "",
        current: true,
        description: bullets.join("\n"),
      },
      {
        id: "exp_2",
        company: "PT Contoh Sukses Abadi",
        position,
        location,
        startDate: "2020-06",
        endDate: "2022-05",
        current: false,
        description: [
          "Shipped 12+ releases with zero critical incidents by tightening code review and CI checks",
          "Cut page load time by 45% through caching, image optimization, and bundle splitting",
          "Mentored 3 junior developers with weekly 1-on-1s and pairing sessions",
        ].join("\n"),
      },
      {
        id: "exp_3",
        company: "PT Nusantara Digital",
        position: `Junior ${position}`,
        location: "Bandung, Indonesia",
        startDate: "2019-01",
        endDate: "2020-05",
        current: false,
        description: GENERIC_BULLETS.slice(0, 3).join("\n"),
      },
    ],
    organizations: [
      {
        id: "org_1",
        organization: "Himpunan Mahasiswa Informatika",
        position: "Coordinator",
        location,
        startDate: "2021-01",
        endDate: "2022-12",
        current: false,
        description: "Coordinated 20 volunteers for campus tech events\nOrganized monthly sharing sessions with 100+ attendees\nBuilt registration site that cut manual admin work by 60%",
      },
      {
        id: "org_2",
        organization: "React Indonesia Community",
        position: "Event Volunteer",
        location: "Jakarta, Indonesia",
        startDate: "2023-03",
        endDate: "",
        current: true,
        description: "Host monthly meetups and maintain event documentation\nOnboard new speakers and review talk proposals",
      },
    ],
    education: [
      {
        id: "edu_1",
        institution: "Universitas Indonesia",
        degree: "S1",
        field: "Computer Science",
        startDate: "2016-08",
        endDate: "2020-06",
        gpa: "3.50",
        level: "univ",
        thesisTitle: "Content-Based Job Recommendation System",
        thesisDescription: "Built a recommendation prototype using TF-IDF and cosine similarity\nEvaluated on 500 job postings with 82% top-5 accuracy\nWrote 80-page thesis documenting method, experiments, and results",
        researchTitle: "",
        researchDescription: "",
      },
      {
        id: "edu_2",
        institution: "SMA Negeri 1 Jakarta",
        degree: "",
        field: "IPA",
        startDate: "2013-07",
        endDate: "2016-06",
        gpa: "",
        level: "school",
        thesisTitle: "",
        thesisDescription: "",
        researchTitle: "",
        researchDescription: "",
      },
    ],
    research: [
      {
        id: "rs_1",
        title: "Hate Speech Detection in Indonesian Tweets",
        status: "Published",
        organization: "AI Lab, Universitas Indonesia",
        location: "Jakarta, Indonesia",
        startDate: "2023-03",
        endDate: "2023-12",
        current: false,
        description: "Fine-tuned IndoBERT on 15k labeled tweets reaching 87% F1-score\nPresented findings at a national student research symposium",
      },
      {
        id: "rs_2",
        title: "Low-Resource Machine Translation",
        status: "Under Review",
        organization: "AI Lab, Universitas Indonesia",
        location: "Jakarta, Indonesia",
        startDate: "2024-01",
        endDate: "",
        current: true,
        description: "Collecting and cleaning 10k+ parallel sentences for regional languages\nRunning baseline Transformer experiments weekly",
      },
    ],
    skills,
    skillGroups,
    projects: [
      {
        id: "proj_1",
        name: "Analytics Dashboard",
        description: "Built a real-time dashboard tracking 50k+ daily events\nReduced manual reporting time from 4 hours to 15 minutes\nStack: React, WebSockets, ClickHouse",
        url: "https://github.com/budisantoso/analytics-dashboard",
        technologies: ["React.js", "WebSockets", "ClickHouse"],
      },
      {
        id: "proj_2",
        name: "Natural-Language Report Assistant",
        description: "Integrated LLM API to let users query reports in plain Indonesian\nReached 70% weekly active usage among pilot team of 30 users",
        url: "https://github.com/budisantoso/nl-report-assistant",
        technologies: ["Next.js", "OpenAI API", "PostgreSQL"],
      },
      {
        id: "proj_3",
        name: "Portfolio Website",
        description: "Built a responsive personal website to showcase selected work\nDeployed with a simple CI pipeline",
        url: "https://github.com/budisantoso/portfolio",
        technologies: ["Next.js", "Tailwind CSS"],
      },
    ],
    certifications: ["Google Project Management", "AWS Certified Cloud Practitioner", "Dicoding Belajar Fundamental Aplikasi Web"],
    achievements: [
      "Exceeded quarterly team target by 15% in 2023",
      "Received appreciation award for consistent on-time delivery",
    ],
    awards: [
      { id: "aw_1", title: "2nd Place Hackathon elevAIte Indonesia 2025", organizer: "Komdigi, Microsoft, elevAIte Hub UGM", year: "2025" },
      { id: "aw_2", title: "Best Graduate, Faculty of Computer Science", organizer: "Universitas Indonesia", year: "2020" },
      { id: "aw_3", title: "Exceeded quarterly team target by 15%", organizer: "PT Sample Maju Bersama", year: "2023" },
      { id: "aw_4", title: "Speaker at React Indonesia Meetup #42", organizer: "React Indonesia Community", year: "2024" },
    ],
    languages: ["Indonesian (native)", "English (professional working proficiency)", "Malay (conversational)"],
  }
}
