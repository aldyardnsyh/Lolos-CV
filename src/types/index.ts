export type ResumeTemplate = "corporate" | "creative" | "modern" | "professional"

export interface ResumePersonalInfo {
  fullName: string
  headline?: string
  email: string
  phone: string
  location: string
  linkedin: string
  portfolio: string
  photo?: string
}

export interface ResumeExperience {
  id: string
  company: string
  position: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

export interface ResumeEducation {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa: string
  level?: "univ" | "school"
  thesisTitle?: string
  thesisDescription?: string
  researchTitle?: string
  researchDescription?: string
}

export interface ResumeSkill {
  id: string
  name: string
  level: "beginner" | "intermediate" | "advanced" | "expert"
}

export interface ResumeSkillGroup {
  id: string
  title: string
  items: string[]
}

export interface ResumeOrganization {
  id: string
  organization: string
  position: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

export interface ResumeProject {
  id: string
  name: string
  description: string
  url: string
  technologies: string[]
}

export interface ResumeData {
  personalInfo: ResumePersonalInfo
  summary: string
  experiences: ResumeExperience[]
  organizations: ResumeOrganization[]
  education: ResumeEducation[]
  skills: ResumeSkill[]
  skillGroups: ResumeSkillGroup[]
  projects: ResumeProject[]
  certifications: string[]
  achievements: string[]
  awards: string[]
  languages: string[]
}

export interface JobStream {
  name: string
  description: string
  preferredBackgrounds: string[]
}

export interface JobPosting {
  url: string
  source: "linkedin" | "jobstreet" | "glints" | "company" | "other"
  companyName: string
  position: string
  location: string
  description: string
  keyRequirements: string[]
  preferredQualifications: string[]
  responsibilities: string[]
  benefits: string[]
  jobStreams: JobStream[]
  educationRequirements: string[]
}

export interface KeyPoint {
  text: string
  importance: "critical" | "important" | "nice-to-have"
  matched: boolean
  matchScore: number
}

export interface ATSAnalysis {
  overallScore: number
  keywordMatch: number
  formatScore: number
  sectionScore: number
  lengthScore: number
  keyPoints: KeyPoint[]
  suggestions: string[]
  missingKeywords: string[]
  matchedKeywords: string[]
}

export type ApiProvider =
  | "deepseek"
  | "opencode"
  | "opencode-zen"
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "groq"
  | "together"
  | "cohere"
  | "perplexity"
  | "custom"

export type ReasoningEffort = "low" | "medium" | "high" | "max" | "xmax"

export interface ProviderConfig {
  id: ApiProvider
  name: string
  baseUrl: string
  models: ProviderModel[]
  apiKeyPattern: RegExp
  apiKeyLabel: string
  docsUrl: string
  color: string
  enabled: boolean
  reasoningEfforts: ReasoningEffort[]
}

export interface ProviderModel {
  id: string
  name: string
  description: string
  maxTokens: number
  free: boolean
  efforts?: ReasoningEffort[]
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyPattern: /^sk-(proj-|svcacct-|admin-|org-)/,
    apiKeyLabel: "sk-proj-... / sk-svcacct-...",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "bg-emerald-600",
    enabled: true,
    reasoningEfforts: ["low", "medium", "high"],
    models: [
      { id: "o3", name: "o3", description: "Advanced reasoning model", maxTokens: 100000, free: false, efforts: ["low", "medium", "high"] },
      { id: "o4-mini", name: "o4-mini", description: "Optimized for coding & dev", maxTokens: 100000, free: false, efforts: ["low", "medium", "high"] },
      { id: "o1", name: "o1", description: "First reasoning model", maxTokens: 100000, free: false, efforts: ["low", "medium", "high"] },
      { id: "o1-mini", name: "o1-mini", description: "Smaller faster reasoning", maxTokens: 65536, free: false, efforts: ["low", "medium", "high"] },
      { id: "gpt-4o", name: "GPT-4o", description: "Omni model (text+vision+audio)", maxTokens: 16384, free: false },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Smaller omni model", maxTokens: 16384, free: true },
      { id: "gpt-4.1", name: "GPT-4.1", description: "1M context, coding focused", maxTokens: 1048576, free: false },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Previous gen high capability", maxTokens: 8192, free: false },
      { id: "gpt-4", name: "GPT-4", description: "Original GPT-4", maxTokens: 8192, free: false },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast & cost-effective", maxTokens: 16384, free: true },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyPattern: /^sk-ant-/,
    apiKeyLabel: "sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com/",
    color: "bg-amber-600",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Best price/performance", maxTokens: 1048576, free: false },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", description: "Previous gen Sonnet", maxTokens: 200000, free: false },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", description: "Earlier gen Sonnet", maxTokens: 200000, free: false },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", description: "Fastest, cost-efficient", maxTokens: 200000, free: false },
      { id: "claude-opus-4-8", name: "Claude Opus 4.8", description: "Premium coding/agents", maxTokens: 1048576, free: false },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", description: "Previous gen Opus", maxTokens: 200000, free: false },
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", description: "Legacy Sonnet (still active)", maxTokens: 200000, free: false },
      { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", description: "Legacy Haiku (still active)", maxTokens: 200000, free: false },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyPattern: /^sk-[A-Za-z0-9]{32}$/,
    apiKeyLabel: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://platform.deepseek.com/api_keys",
    color: "bg-blue-600",
    enabled: true,
    reasoningEfforts: ["low", "medium", "high"],
    models: [
      { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", description: "Flagship MoE, 1M context, 1.6T params", maxTokens: 1048576, free: false, efforts: ["low", "medium", "high"] },
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", description: "Fast MoE, 1M context, 284B params", maxTokens: 1048576, free: true, efforts: ["low", "medium", "high"] },
      { id: "deepseek-chat", name: "DeepSeek Chat", description: "Legacy (maps to V4 Flash)", maxTokens: 1048576, free: true },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", description: "Legacy (maps to V4 Flash thinking)", maxTokens: 1048576, free: false },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyPattern: /^(AIza|AQ\.)/,
    apiKeyLabel: "AIza... / AQ...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    color: "bg-blue-500",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Mature reasoning, 1M context", maxTokens: 1048576, free: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Balanced cost/performance", maxTokens: 1048576, free: true },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Ultra low-cost", maxTokens: 1048576, free: true },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Fast versatile model", maxTokens: 8192, free: true },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", description: "Budget-friendly", maxTokens: 8192, free: true },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyPattern: /^[A-Za-z0-9]{32,}$/,
    apiKeyLabel: "32+ char alphanumeric",
    docsUrl: "https://console.mistral.ai/api-keys/",
    color: "bg-orange-600",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", description: "Flagship multimodal 675B MoE", maxTokens: 256000, free: false },
      { id: "mistral-medium-latest", name: "Mistral Medium", description: "Frontier agentic 119B MoE", maxTokens: 256000, free: false },
      { id: "mistral-small-latest", name: "Mistral Small", description: "Unified reasoning+coding+vision", maxTokens: 256000, free: true },
      { id: "codestral-latest", name: "Codestral", description: "Low-latency code generation", maxTokens: 256000, free: false },
      { id: "ministral-8b-latest", name: "Ministral 8B", description: "Edge model 8B", maxTokens: 128000, free: true },
      { id: "open-mistral-nemo", name: "Mistral Nemo", description: "Lightweight open model", maxTokens: 128000, free: true },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyPattern: /^gsk_/,
    apiKeyLabel: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    color: "bg-pink-600",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", description: "Flagship chat/reasoning, 280 t/s", maxTokens: 131072, free: true },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", description: "Fast cost-efficient, 560 t/s", maxTokens: 131072, free: true },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", description: "Reasoning distilled Llama", maxTokens: 131072, free: true },
      { id: "qwen-qwq-32b", name: "QwQ 32B", description: "Qwen reasoning model", maxTokens: 131072, free: true },
      { id: "mistral-saba-24b", name: "Mistral Saba 24B", description: "Mistral via Groq", maxTokens: 32768, free: true },
      { id: "qwen-3.6-27b", name: "Qwen 3.6 27B", description: "Updated Qwen model", maxTokens: 131072, free: true },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyPattern: /^[A-Za-z0-9]{32,}$/,
    apiKeyLabel: "32+ char alphanumeric",
    docsUrl: "https://api.together.xyz/settings/api-keys",
    color: "bg-indigo-600",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B", description: "Meta's Llama via Together", maxTokens: 131072, free: false },
      { id: "meta-llama/Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B", description: "Largest Llama, 405B params", maxTokens: 131072, free: false },
      { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro", description: "DeepSeek flagship via Together", maxTokens: 1048576, free: false },
      { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash", description: "DeepSeek fast via Together", maxTokens: 1048576, free: false },
      { id: "Qwen/Qwen3-235B-A22B-Instruct", name: "Qwen3 235B", description: "Alibaba's Qwen MoE", maxTokens: 131072, free: false },
      { id: "google/gemma-3n-E4B-it", name: "Gemma 3N 4B", description: "Google's Gemma via Together", maxTokens: 8192, free: true },
      { id: "mistralai/Mistral-Small-4", name: "Mistral Small 4", description: "Mistral via Together", maxTokens: 256000, free: false },
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    apiKeyPattern: /^pplx-/,
    apiKeyLabel: "pplx-...",
    docsUrl: "https://www.perplexity.ai/settings/api",
    color: "bg-teal-600",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "sonar-pro", name: "Sonar Pro", description: "Perplexity's Pro search model", maxTokens: 8192, free: false },
      { id: "sonar", name: "Sonar", description: "Base Sonar search model", maxTokens: 8192, free: false },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    baseUrl: "https://api.cohere.ai/v1",
    apiKeyPattern: /^[A-Za-z0-9]{40}$/,
    apiKeyLabel: "40 char alphanumeric",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    color: "bg-red-600",
    enabled: true,
    reasoningEfforts: [],
    models: [
      { id: "command-r-plus", name: "Command R+", description: "Most capable Cohere model", maxTokens: 128000, free: false },
      { id: "command-r", name: "Command R", description: "Balanced Cohere model", maxTokens: 128000, free: false },
    ],
  },
  {
    id: "opencode",
    name: "OpenCode",
    baseUrl: "https://api.opencode.ai/v1",
    apiKeyPattern: /^sk-[A-Za-z0-9]{32,}$/,
    apiKeyLabel: "sk-... (via OpenCode)",
    docsUrl: "https://opencode.ai/docs",
    color: "bg-violet-600",
    enabled: true,
    reasoningEfforts: ["low", "medium", "high", "max", "xmax"],
    models: [
      { id: "opencode/deepseek-v4-pro", name: "DeepSeek V4 Pro", description: "Flagship via OpenCode", maxTokens: 1048576, free: false, efforts: ["low", "medium", "high"] },
      { id: "opencode/deepseek-v4-flash", name: "DeepSeek V4 Flash", description: "Fast via OpenCode", maxTokens: 1048576, free: false, efforts: ["low", "medium", "high"] },
      { id: "opencode/gpt-4o-mini", name: "GPT-4o Mini", description: "Affordable via OpenCode", maxTokens: 16384, free: false },
      { id: "opencode/claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Anthropic via OpenCode", maxTokens: 1048576, free: false },
      { id: "opencode/deepseek-chat", name: "DeepSeek Chat", description: "Chat model via OpenCode", maxTokens: 8192, free: false },
      { id: "opencode/deepseek-coder", name: "DeepSeek Coder", description: "Code model via OpenCode", maxTokens: 8192, free: false },
    ],
  },
  {
    id: "opencode-zen",
    name: "OpenCode Zen",
    baseUrl: "https://opencode.ai/zen/v1",
    apiKeyPattern: /^sk-[A-Za-z0-9]{16,}$/,
    apiKeyLabel: "sk-... (OpenCode Zen free)",
    docsUrl: "https://opencode.ai/zen",
    color: "bg-teal-500",
    enabled: true,
    reasoningEfforts: ["low", "medium", "high"],
    models: [
      { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free", description: "Free tier, 1M context, 284B params", maxTokens: 1048576, free: true, efforts: ["low", "medium", "high"] },
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", description: "Fast MoE via OpenCode Zen", maxTokens: 1048576, free: false, efforts: ["low", "medium", "high"] },
      { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", description: "Flagship MoE via OpenCode Zen", maxTokens: 1048576, free: false, efforts: ["low", "medium", "high"] },
      { id: "deepseek-chat", name: "DeepSeek Chat", description: "Chat model via Zen", maxTokens: 8192, free: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "OpenAI's affordable model via Zen", maxTokens: 16384, free: false },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", description: "Anthropic fastest model via Zen", maxTokens: 200000, free: false },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Google's balanced model via Zen", maxTokens: 1048576, free: false },
    ],
  },
  {
    id: "custom",
    name: "Custom / Universal",
    baseUrl: "",
    apiKeyPattern: /^$/,
    apiKeyLabel: "opsional (endpoint lokal boleh tanpa key)",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    color: "bg-slate-600",
    enabled: true,
    reasoningEfforts: [],
    models: [],
  },
]

export const AMBIGUOUS_SK_PROVIDERS: ProviderConfig[] = PROVIDERS.filter(
  (p) => p.id === "deepseek" || p.id === "opencode" || p.id === "opencode-zen"
)

export const JOB_SOURCES = [
  { id: "linkedin", name: "LinkedIn", url: "https://linkedin.com" },
  { id: "jobstreet", name: "JobStreet", url: "https://jobstreet.com" },
  { id: "glints", name: "Glints", url: "https://glints.com" },
  { id: "company", name: "Company Website", url: "" },
  { id: "other", name: "Other", url: "" },
]
