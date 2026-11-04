"use client"

import type { JobPosting, ResumeData } from "@/types"

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

// Grup skill default persona fresh graduate administrasi (bahasa Indonesia,
// pasar lamaran lokal). Mencontohkan versi selengkap-lengkapnya: tiap grup
// punya judul yang bisa diedit user langsung di editor.
const RICH_DEFAULT_GROUPS = [
  { id: "sg_1", title: "Perangkat Lunak Kantor", items: ["Microsoft Excel", "Microsoft Word", "Microsoft PowerPoint", "Google Workspace"] },
  { id: "sg_2", title: "Administrasi Perkantoran", items: ["Administrasi Perkantoran", "Pengarsipan Dokumen", "Input & Rekap Data", "Penyusunan Surat-Menyurat"] },
  { id: "sg_3", title: "Komunikasi & Kepribadian", items: ["Komunikasi", "Kerja Tim", "Teliti & Terorganisir", "Manajemen Waktu"] },
]

// Contoh CV deterministik tanpa API — persona NETRAL fresh graduate D3
// Administrasi berbahasa Indonesia (pasar lamaran lokal): 1 pengalaman magang,
// 1 organisasi kampus, 1 pendidikan, 3 grup skill. Nama perusahaan/kampus
// sengaja placeholder ([Nama Perusahaan], [Nama Universitas]) agar tidak bisa
// lolos ke CV asli; bullet memakai angka ilustratif mencontohkan gaya bullet
// terukur. Tanpa foto, tanpa section riset, tanpa award. Kalau ada data
// lowongan, perusahaan, lokasi, dan grup skill pertama disesuaikan agar match.
export function buildMockSampleResume(job: JobPosting | null): ResumeData {
  const company = !isUnknownCompany(job?.companyName)
    ? String(job?.companyName).trim()
    : "[Nama Perusahaan]"
  const location = job?.location?.trim() || "Jakarta, Indonesia"

  const jobSkills = cleanList(job?.keyRequirements, 5)
    .concat(cleanList(job?.preferredQualifications, 3))
    .slice(0, 8)
  const hasJobSkills = jobSkills.length > 0
  const skillGroups = hasJobSkills
    ? [
        { id: "sg_1", title: "Keahlian yang Relevan", items: jobSkills.slice(0, 5) },
        ...RICH_DEFAULT_GROUPS.slice(0, 2).map((g, i) => ({ ...g, id: `sg_${i + 2}` })),
      ]
    : RICH_DEFAULT_GROUPS.map((g) => ({ ...g }))
  const flatNames = skillGroups.flatMap((g) => g.items).slice(0, 10)
  const levels = ["advanced", "intermediate", "intermediate", "advanced", "intermediate", "beginner", "intermediate", "beginner", "advanced", "intermediate"] as const
  const skills = flatNames.map((name, i) => ({
    id: `sk_${i + 1}`,
    name,
    level: levels[i % levels.length],
  }))

  return {
    personalInfo: {
      fullName: "Rina Putri",
      headline: "Fresh Graduate Administrasi | Siap Kontribusi di Tim Anda",
      email: "",
      phone: "+62 812-3456-7890",
      location,
      linkedin: "",
      portfolio: "",
      photo: "",
    },
    summary:
      "Fresh graduate D3 Administrasi dengan pengalaman magang di bidang administrasi perkantoran dan aktif berorganisasi di kampus. Terbiasa mengelola arsip dan merekap data menggunakan Microsoft Excel serta menyusun dokumen secara rapi dan tepat waktu. Teliti, mudah beradaptasi, dan siap berkontribusi untuk tim Anda.",
    experiences: [
      {
        id: "exp_1",
        company,
        position: "Magang Staf Administrasi",
        location,
        startDate: "2024-07",
        endDate: "2024-12",
        current: false,
        description: [
          "Mengelola arsip 200+ dokumen vendor per bulan dengan sistem penomoran digital, memangkas waktu pencarian dokumen dari 15 menjadi 2 menit",
          "Merekap data pembelian 3 cabang ke Microsoft Excel setiap minggu dengan akurasi 99% saat audit internal",
          "Menyusun dan mendistribusikan 40+ surat masuk/keluar per minggu tepat waktu tanpa ada yang terlewat",
        ].join("\n"),
      },
    ],
    organizations: [
      {
        id: "org_1",
        organization: "Himpunan Mahasiswa Administrasi",
        position: "Sekretaris",
        location,
        startDate: "2023-01",
        endDate: "2024-12",
        current: false,
        description: [
          "Menyusun notulen dan mengarsipkan 24 rapat organisasi per tahun agar keputusan mudah ditelusuri",
          "Mengelola administrasi pendaftaran acara tahunan dengan 150+ peserta bersama 12 panitia",
        ].join("\n"),
      },
    ],
    education: [
      {
        id: "edu_1",
        institution: "[Nama Universitas]",
        degree: "D3",
        field: "Administrasi",
        startDate: "2022-08",
        endDate: "2025-07",
        gpa: "3.45",
        level: "univ",
        thesisTitle: "",
        thesisDescription: "",
        researchTitle: "",
        researchDescription: "",
      },
    ],
    research: [],
    skills,
    skillGroups,
    projects: [],
    certifications: ["Sertifikat Pelatihan Microsoft Office & Administrasi Perkantoran"],
    achievements: [],
    awards: [],
    languages: ["Bahasa Indonesia (bahasa ibu)", "Bahasa Inggris (menengah)"],
  }
}
