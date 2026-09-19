const STOPWORDS = new Set<string>([
  "adalah", "ialah", "yaitu", "yakni", "bahwa", "yang", "untuk", "dengan", "pada",
  "dalam", "dari", "dan", "atau", "ini", "itu", "kami", "kita", "saya", "anda",
  "akan", "telah", "sudah", "belum", "dapat", "bisa", "harus", "juga", "lebih",
  "kurang", "sangat", "paling", "agar", "karena", "jika", "maka", "saat", "ketika",
  "secara", "oleh", "bagi", "antara", "terhadap", "tentang", "hingga", "sampai",
  "sejak", "selama", "semua", "setiap", "beberapa", "banyak", "sedikit", "ada",
  "tidak", "bukan", "jangan", "apakah", "bagaimana", "dimana", "kapan", "siapa",
  "mengapa", "para", "serta", "punya", "memiliki", "mempunyai", "berikut", "lain",
  "lainnya", "seperti", "contoh", "khususnya", "utamanya", "terutama", "minimal",
  "maksimal", "tahun", "bulan", "hari", "jam", "orang", "perusahaan", "lowongan",
  "posisi", "jabatan", "gaji", "upah", "upahan", "tunjangan", "benefit", "benefits",
  "requirement", "requirements", "qualification", "qualifications", "kualifikasi",
  "persyaratan", "syarat", "deskripsi", "description", "melamar", "lamaran",
  "pelamar", "kandidat", "wawancara", "interview", "urgent", "segera", "tayang",
  "diperbarui", "lokasi", "alamat", "kontak", "berdiri", "bergerak", "bidang",
  "kebutuhan", "usaha", "visi", "misi", "pilihan", "utama", "dinamis", "karyawan",
  "anak", "pt", "cv", "tbk", "persero", "group", "grup", "holding", "inc", "ltd",
  "llc", "corp", "the", "and", "for", "with", "from", "that", "this", "will",
  "shall", "must", "have", "has", "had", "are", "was", "were", "been", "being",
  "our", "your", "their", "its", "all", "any", "more", "most", "less", "least",
  "very", "also", "into", "over", "about", "after", "before", "between", "both",
  "each", "other", "some", "such", "only", "same", "than", "then", "them", "they",
  "there", "these", "those", "who", "whom", "whose", "what", "when", "where",
  "why", "how", "not", "nor", "but", "yet", "because", "while", "during",
  "through", "against", "without", "within", "along", "across", "etc", "job",
  "jobs", "work", "working", "candidate", "candidates", "applicant", "applicants",
  "company", "location", "address", "salary", "responsibilities", "position",
  "role", "apply", "application", "minimum", "maximum", "years", "year", "months",
  "month", "able", "good", "great", "strong", "skill", "skills", "having",
  "including", "include", "includes", "based", "full", "time", "part", "remote",
  "onsite", "hybrid", "fresh", "graduate", "graduates", "experienced", "tools",
  "tool", "usia", "jurusan", "menggunakan", "pria", "wanita",
])

export function isJunkToken(token: string, exclude?: Set<string>): boolean {
  const t = token.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9+#]+$/g, "")
  if (!t || t.length < 3) return true
  if (!/[a-z]/.test(t)) return true
  if (/^[\d.,\-/\s]+$/.test(t)) return true
  if (STOPWORDS.has(t)) return true
  if (exclude?.has(t)) return true
  return false
}

export function buildExclusionTerms(...sources: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const src of sources) {
    if (!src) continue
    for (const part of String(src).split(/[^a-zA-Z0-9]+/)) {
      const t = part.toLowerCase()
      if (t.length >= 2) out.add(t)
    }
  }
  return out
}

export function extractMeaningfulTokens(text: string, exclude?: Set<string>): string[] {
  const seen = new Set<string>()
  const normalized = String(text || "").replace(/([a-zA-Z])\/([a-zA-Z])/g, "$1-$2")
  for (const part of normalized.split(/[^a-zA-Z0-9+#-]+/)) {
    const t = part.trim().toLowerCase()
    if (!t || isJunkToken(t, exclude)) continue
    seen.add(t)
  }
  return Array.from(seen)
}

export function sanitizeKeywordList(value: unknown, exclude?: Set<string>, limit = 12): string[] {
  const arr = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of arr) {
    const s = (typeof item === "string"
      ? item
      : String(item?.name ?? item?.text ?? item ?? "")
    ).replace(/\s+/g, " ").trim()
    if (!s) continue
    const meaningful = s.split(/\s+/).filter((w) => !isJunkToken(w, exclude))
    if (meaningful.length === 0) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= limit) break
  }
  return out
}
