"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Key, Check, Eye, EyeOff, AlertCircle, ExternalLink, Sparkles, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Wifi, WifiOff, Zap, Coins,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PROVIDERS, type ProviderConfig, type ProviderModel, type ReasoningEffort } from "@/types"
import { detectProviderWithCandidates, getModelsForProvider, testConnection, getDefaultModel, getReasoningEffortsForModel, fetchAvailableModels, safeLocalGet, safeLocalSet, safeLocalRemove, type DetectionResult } from "@/lib/api"
import { cn } from "@/lib/utils"

const EFFORT_LABELS: Record<ReasoningEffort, string> = {
  low: "Low (Cepat)",
  medium: "Medium (Seimbang)",
  high: "High (Teliti)",
  max: "Max (Maksimal)",
  xmax: "XMax (Ekstrim)",
}

const CUSTOM_BASE_URL_PRESETS = [
  { name: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  { name: "Ollama (lokal)", url: "http://localhost:11434/v1" },
  { name: "LM Studio (lokal)", url: "http://localhost:1234/v1" },
]

const EFFORT_COLORS: Record<ReasoningEffort, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  medium: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  high: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  max: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  xmax: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
}

export function ApiSettings() {
  const [apiKey, setApiKey] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedEffort, setSelectedEffort] = useState<ReasoningEffort>("medium")
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [showFullConfig, setShowFullConfig] = useState(false)
  const [detectedProvider, setDetectedProvider] = useState<ProviderConfig | null>(null)
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([])
  const [effortOptions, setEffortOptions] = useState<ReasoningEffort[]>([])
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [ambiguousResult, setAmbiguousResult] = useState<DetectionResult | null>(null)
  const [customBaseUrl, setCustomBaseUrl] = useState("")
  const [liveModels, setLiveModels] = useState<ProviderModel[] | null>(null)
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    const stored = safeLocalGet("api_config")
    setHasConfig(!!stored)
    if (stored) {
      try {
        const config = JSON.parse(stored)
        setApiKey(config.apiKey || "")
        setSelectedModel(config.model || "")
        setSelectedEffort(config.reasoningEffort || "medium")
        setShowFullConfig(false)
        const provider = PROVIDERS.find((p) => p.id === config.provider)
        if (provider) {
          setDetectedProvider(provider)
          setAvailableModels(getModelsForProvider(provider.id))
          // Keep saved model even if it's not in the static list (may have been fetched live from the API)
          setSelectedModel(config.model || getDefaultModel(provider.id))
          // Restore custom base URL too, otherwise re-saving wipes it back to the default
          setCustomBaseUrl(config.baseUrl && config.baseUrl !== provider.baseUrl ? config.baseUrl : "")
        }
      } catch {}
    }
  }, [])

  // Effort selector selalu mengikuti MODEL terpilih, bukan hanya provider.
  useEffect(() => {
    if (!detectedProvider) {
      setEffortOptions([])
      return
    }
    const opts = getReasoningEffortsForModel(detectedProvider.id, selectedModel || undefined)
    setEffortOptions(opts)
    if (!opts.includes(selectedEffort)) setSelectedEffort(opts[0] ?? "medium")
  }, [detectedProvider?.id, selectedModel, selectedEffort])

  const applyProvider = useCallback((provider: ProviderConfig) => {
    setDetectedProvider(provider)
    setAvailableModels(getModelsForProvider(provider.id))
    setSelectedModel(getDefaultModel(provider.id))
    setLiveModels(null)
    setModelsError(null)
    setTestResult(null)
    setAmbiguousResult(null)
  }, [])

  const handleKeyChange = useCallback((key: string) => {
    setApiKey(key)
    setTestResult(null)
    setAmbiguousResult(null)
    // Jangan hapus pilihan Custom saat key dikosongkan (endpoint lokal tanpa auth)
    if (!key.trim()) {
      if (detectedProvider?.id === "custom") return
      setDetectedProvider(null); setAvailableModels([]); setEffortOptions([]); setSelectedModel(""); return
    }
    const result = detectProviderWithCandidates(key)
    if (result.provider && !result.ambiguous) {
      setDetectedProvider(result.provider)
      const models = getModelsForProvider(result.provider.id)
      setAvailableModels(models)
      if (models.length > 0 && (!selectedModel || !models.find((m) => m.id === selectedModel))) {
        setSelectedModel(models[0].id)
      }
    } else if (result.ambiguous) {
      setDetectedProvider(null)
      setAmbiguousResult(result)
      setAvailableModels([])
      setEffortOptions([])
      setSelectedModel("")
    } else {
      setDetectedProvider(null); setAvailableModels([]); setEffortOptions([]); setSelectedModel("")
    }
  }, [selectedModel])

  const handleFetchModels = useCallback(async () => {
    if (!detectedProvider) return
    const custom = detectedProvider.id === "custom"
    if (!custom && !apiKey.trim()) return
    if (custom && !customBaseUrl.trim()) return
    setLoadingModels(true); setModelsError(null)
    try {
      const models = await fetchAvailableModels({
        apiKey: apiKey.trim(),
        model: selectedModel,
        provider: detectedProvider.id,
        baseUrl: customBaseUrl || detectedProvider.baseUrl,
        reasoningEffort: selectedEffort,
      })
      setLiveModels(models)
      if (models.length > 0 && !models.find((m) => m.id === selectedModel)) {
        setSelectedModel(models[0].id)
      }
    } catch (e: any) {
      setModelsError(e?.message || "Gagal memuat daftar model dari API")
    } finally {
      setLoadingModels(false)
    }
  }, [detectedProvider, apiKey, customBaseUrl, selectedModel, selectedEffort])

  const handleTestConnection = async () => {
    if (!detectedProvider) return
    const custom = detectedProvider.id === "custom"
    if (!custom && !apiKey.trim()) return
    if (custom && !customBaseUrl.trim()) return
    if (custom && !selectedModel) return
    setTesting(true); setTestResult(null)
    const result = await testConnection({
      apiKey: apiKey.trim(),
      model: selectedModel || getDefaultModel(detectedProvider.id),
      provider: detectedProvider.id,
      baseUrl: customBaseUrl || detectedProvider.baseUrl,
      reasoningEffort: selectedEffort,
    })
    setTestResult(result); setTesting(false)
  }

  const saveConfig = () => {
    if (!detectedProvider) return
    const custom = detectedProvider.id === "custom"
    if (!custom && !apiKey.trim()) return
    if (custom && !customBaseUrl.trim()) return
    const config = {
      apiKey: apiKey.trim(),
      model: selectedModel || getDefaultModel(detectedProvider.id),
      provider: detectedProvider.id,
      baseUrl: customBaseUrl || detectedProvider.baseUrl,
      reasoningEffort: effortOptions.includes(selectedEffort) ? selectedEffort : effortOptions[0],
    }
    safeLocalSet("api_config", JSON.stringify(config))
    setSaved(true)
    setHasConfig(true)
    setTestResult(true)
    window.dispatchEvent(new Event("api_config_changed"))
    setTimeout(() => setSaved(false), 3000)
  }

  const clearConfig = () => {
    safeLocalRemove("api_config")
    safeLocalRemove("job_analysis")
    setApiKey(""); setSelectedModel(""); setSelectedEffort("medium")
    setDetectedProvider(null); setAvailableModels([]); setEffortOptions([])
    setHasConfig(false); setShowFullConfig(false); setTestResult(null); setAmbiguousResult(null); setCustomBaseUrl("")
    setLiveModels(null); setLoadingModels(false); setModelsError(null)
    window.dispatchEvent(new Event("api_config_changed"))
  }

  const shownModels = liveModels ?? availableModels
  const isCustom = detectedProvider?.id === "custom"
  // Base URL localhost (Ollama/LM Studio) hanya terjangkau server yang jalan
  // di perangkat yang sama. Kalau app dibuka dari deploy, tes pasti gagal —
  // beri tahu user lebih dulu daripada menampilkan "koneksi gagal" misterius.
  const isLocalHostname = (h: string) =>
    ["localhost", "127.0.0.1", "::1"].includes(h.toLowerCase())
  const isLocalBaseUrl = (() => {
    try {
      return !!customBaseUrl.trim() && isLocalHostname(new URL(customBaseUrl.trim()).hostname)
    } catch {
      return false
    }
  })()
  const isLocalAppHost =
    typeof window !== "undefined" && isLocalHostname(window.location.hostname)
  const showLocalhostWarning = isCustom && isLocalBaseUrl && !isLocalAppHost
  // Custom: key opsional, Base URL wajib; provider lain: key wajib
  const canTest = !!detectedProvider && (isCustom ? !!customBaseUrl.trim() : !!apiKey.trim()) && (isCustom ? !!selectedModel : true)
  // Simpan hanya bisa setelah tes koneksi berhasil — pastikan user tidak bingung
  const canSave = canTest && testResult === true && !!selectedModel
  const freeCount = shownModels.filter((m) => m.free).length
  const paidCount = shownModels.filter((m) => !m.free).length
  // Reset testResult saat input berubah
  useEffect(() => { if (testResult !== null) setTestResult(null) }, [apiKey, selectedModel, customBaseUrl, detectedProvider?.id])

  return (
    <section id="api-settings" className="py-24">
      <div className="container max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary text-white shadow-xl">
              <Key className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Konfigurasi{" "}
            <span className="text-primary">
              API Key
            </span>
          </h2>
          <p className="text-muted-foreground">
            Masukkan API key dari penyedia yang kamu miliki. Provider dan model yang tersedia akan terdeteksi otomatis.
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="w-5 h-5 text-primary" />
                  Koneksi API
                </CardTitle>
                <CardDescription>
                  {hasConfig && !showFullConfig
                    ? "API Key sudah dikonfigurasi. Klik 'Ubah Setting' untuk mengganti."
                    : "Masukkan API key, provider akan terdeteksi otomatis"}
                </CardDescription>
              </div>
              {detectedProvider && (
                <Badge className={cn("text-white", detectedProvider.color)}>{detectedProvider.name}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasConfig && !showFullConfig ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">API Key Aktif</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                      {detectedProvider?.name} &middot; {selectedModel || (detectedProvider ? getDefaultModel(detectedProvider.id) : "")} &middot; {(customBaseUrl || detectedProvider?.baseUrl || "").replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing} title="Tes koneksi ulang" className="gap-1.5">
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : testResult === true ? <Wifi className="w-4 h-4 text-emerald-500" /> : testResult === false ? <WifiOff className="w-4 h-4 text-red-500" /> : <RefreshCw className="w-4 h-4" />}
                      Tes Koneksi
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowFullConfig(true)}>
                      Ubah Setting
                    </Button>
                  </div>
                </div>
              </div>
            ) : (<>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showKey ? "text" : "password"}
                    placeholder={isCustom ? "Kosongkan untuk endpoint lokal tanpa auth (opsional)" : detectedProvider ? `Memasukkan ${detectedProvider.name} API key...` : "Masukkan API key (auto-detect)..."}
                    value={apiKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    className="pr-20 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            {apiKey && !detectedProvider && !ambiguousResult && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Provider tidak terdeteksi otomatis</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Format API key tidak dikenali, tapi tetap bisa dilanjutkan: pilih provider secara manual pada daftar di bawah,
                    atau gunakan <strong>Custom / Universal</strong> lalu isi Base URL endpoint Anda sendiri (mendukung Ollama, LM Studio,
                    OpenRouter, atau proxy OpenAI-compatible lain).
                  </p>
                </div>
              </div>
            )}

            {ambiguousResult && (
              <div className="space-y-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Provider tidak dapat dideteksi secara otomatis
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      API key ini bisa berasal dari beberapa provider, termasuk layanan agregator multi-model
                      (OpenRouter, OpenAgentic, dan sejenisnya) yang menyatukan banyak model dari provider lain.
                      Jika key Anda dari agregator, pilih <strong>Custom / Universal</strong> di bawah, isi Base URL
                      layanan tersebut, lalu klik "Muat Live" untuk melihat semua model (gratis & berbayar):
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ambiguousResult.candidates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyProvider(p)}
                      className={cn(
                        "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2",
                        detectedProvider?.id === p.id
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500",
                        detectedProvider?.id !== p.id && "bg-white dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      )}
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full", p.color)} />
                      {p.name}
                      {detectedProvider?.id === p.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(apiKey.trim() || detectedProvider) && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Provider <span className="text-[10px]">(klik untuk ganti)</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDERS.filter((p) => p.enabled).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyProvider(p)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                        detectedProvider?.id === p.id
                          ? `${p.color} text-white border-transparent`
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground bg-background"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {detectedProvider && (availableModels.length > 0 || detectedProvider.id === "custom") && (
              <div className="space-y-3">
                {detectedProvider.id === "custom" && (
                  <p className="text-xs text-muted-foreground">
                    Provider kustom memakai format OpenAI-compatible (<code className="font-mono">{"{baseUrl}/chat/completions"}</code> dan <code className="font-mono">{"{baseUrl}/models"}</code>).
                    Cocok untuk agregator multi-model (OpenRouter, OpenAgentic, dll.), endpoint lokal Ollama/LM Studio, atau proxy lain.
                    Isi Base URL, lalu klik Muat Live untuk mengenali semua model yang tersedia.
                  </p>
                )}
                {detectedProvider.id === "custom" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Base URL (pilih cepat, atau isi manual di Advanced Settings)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CUSTOM_BASE_URL_PRESETS.map((preset) => (
                        <button
                          key={preset.url}
                          onClick={() => setCustomBaseUrl(preset.url)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                            customBaseUrl === preset.url
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {detectedProvider.id === "custom" && !customBaseUrl.trim() && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">Base URL wajib untuk provider kustom. Contoh: http://localhost:20128/v1</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label>Pilih Model AI - {detectedProvider.name}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFetchModels}
                      disabled={loadingModels || !detectedProvider || (!isCustom && !apiKey.trim()) || (isCustom && !customBaseUrl.trim())}
                      title={isCustom && !customBaseUrl.trim() ? "Isi Base URL dulu" : "Muat semua model yang tersedia langsung dari API"}
                    >
                      {loadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {liveModels ? `${shownModels.length} Live` : "Muat Live"}
                    </Button>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> {freeCount} Free
                      </Badge>
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1">
                        <Coins className="w-2.5 h-2.5" /> {paidCount} Paid
                      </Badge>
                    </div>
                  </div>
                </div>

                {liveModels && (
                  <p className="text-xs text-muted-foreground">
                    Daftar live dari API ({liveModels.length} model). Semua model di bawah dapat dipilih.
                  </p>
                )}

                {modelsError && (
                  <div role="alert" className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">Gagal memuat model: {modelsError}</p>
                  </div>
                )}

                {shownModels.length === 0 && !liveModels && !loadingModels && !modelsError && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada daftar model. Klik "Muat Live" untuk mengambil dari <code className="font-mono">{customBaseUrl || detectedProvider.baseUrl || "Base URL"}</code>.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {shownModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all duration-200 relative",
                        selectedModel === model.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className={cn("w-4 h-4", selectedModel === model.id ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-semibold text-sm">{model.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{detectedProvider.name}</Badge>
                        <Badge
                          variant={model.free ? "success" : "default"}
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            model.free
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          )}
                        >
                          {model.free ? "Free" : "Paid"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {effortOptions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Reasoning Effort
                </Label>
                <p className="text-xs text-muted-foreground">
                  Kontrol seberapa dalam AI menganalisis sebelum merespon. Effort tinggi = hasil lebih teliti, tapi lebih lambat.
                </p>
                <div className="flex flex-wrap gap-2">
                  {effortOptions.map((effort) => (
                    <button
                      key={effort}
                      onClick={() => setSelectedEffort(effort)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all",
                        selectedEffort === effort
                          ? EFFORT_COLORS[effort]
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      )}
                    >
                      {EFFORT_LABELS[effort]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={saveConfig} disabled={!canSave} className="flex-1 gap-2 min-w-[180px]" title={!canSave ? "Tes koneksi dulu sebelum menyimpan" : "Simpan konfigurasi"}>
                {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : "Simpan Konfigurasi"}
              </Button>
              {hasConfig && <Button variant="outline" onClick={clearConfig}>Hapus</Button>}
              {detectedProvider && (
                <>
                  <Button variant="outline" onClick={handleTestConnection} disabled={testing || !canTest} className="gap-2" title={canTest ? "Tes koneksi ke provider" : isCustom ? "Pilih model dulu" : "Isi API key dulu"}>
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : testResult === true ? <Wifi className="w-4 h-4 text-emerald-600" /> : testResult === false ? <WifiOff className="w-4 h-4 text-red-600" /> : <RefreshCw className="w-4 h-4" />}
                    {testing ? "Menguji..." : "Tes Koneksi"}
                  </Button>
                  {testResult === true && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Koneksi berhasil, siap disimpan</span>
                  )}
                  {testResult === false && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Koneksi gagal - periksa API Key, Base URL, atau model</span>
                  )}
                  {showLocalhostWarning && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Base URL localhost hanya terjangkau saat dijalankan lokal (npm run dev). Di versi deploy, pakai endpoint publik.</span>
                  )}
                </>
              )}
            </div>
            {!canSave && detectedProvider && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {testing ? "Sedang menguji koneksi..." : testResult === false ? "Koneksi gagal. Perbaiki dulu, lalu tes lagi sebelum menyimpan." : "Langkah terakhir: klik \"Tes Koneksi\" dulu. Kalau berhasil, tombol Simpan akan aktif."}
              </p>
            )}

            <div className="border-t border-border pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="base-url">Base URL (opsional - custom endpoint)</Label>
                    <Input
                      id="base-url"
                      placeholder={detectedProvider ? `Default: ${detectedProvider.baseUrl}` : "https://api.example.com/v1"}
                      value={customBaseUrl}
                      onChange={(e) => setCustomBaseUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Info Provider Lain</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROVIDERS.filter((p) => p.enabled).map((p) => (
                        <a
                          key={p.id}
                          href={p.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent transition-colors text-xs"
                        >
                          <div className={cn("w-2 h-2 rounded-full", p.color)} />
                          <span>{p.name}</span>
                          <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {hasConfig && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => { setShowFullConfig(false); clearConfig() }}>
                  Hapus Konfigurasi
                </Button>
              </div>
            )}
          </>)}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
