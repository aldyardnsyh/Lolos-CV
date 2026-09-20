"use client"

import { useState, useEffect } from "react"
import { Menu, X, Sparkles, Settings, CheckCircle2, Key, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getApiConfig } from "@/lib/api"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setApiConfigured(!!getApiConfig())
    setIsDark(document.documentElement.classList.contains("dark"))
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => { window.removeEventListener("scroll", handleScroll) }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    try { localStorage.setItem("theme", next ? "dark" : "light") } catch {}
  }

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
    setIsMobileMenuOpen(false)
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <button
          onClick={() => scrollTo("hero")}
          className="flex items-center gap-2 group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center w-9 h-9 bg-primary rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">
            Lolos<span className="text-primary">CV</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Fitur", href: "features" },
            { label: "Cara Kerja", href: "how-it-works" },
            { label: "Template", href: "templates" },
            { label: "Harga", href: "pricing" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => scrollTo(item.href)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-all duration-200"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
            className="p-2.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTo("api-settings")}
            className="relative"
          >
            {apiConfigured ? (
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
            ) : (
              <Key className="w-4 h-4 mr-2" />
            )}
            API Key
          </Button>
          <Button
            size="sm"
            onClick={() => scrollTo("builder")}
          >
            Mulai Buat Resume
          </Button>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div
        className={cn(
          "md:hidden border-b border-border bg-white/95 backdrop-blur-xl transition-all duration-300 overflow-hidden",
          isMobileMenuOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="container py-4 space-y-2">
          {[
            { label: "Fitur", href: "features" },
            { label: "Cara Kerja", href: "how-it-works" },
            { label: "Template", href: "templates" },
            { label: "Harga", href: "pricing" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => scrollTo(item.href)}
              className="block w-full text-left px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-all"
            >
              {item.label}
            </button>
          ))}
          <hr className="border-border my-2" />
          <button
            onClick={() => { toggleTheme(); setIsMobileMenuOpen(false) }}
            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-all"
          >
            {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {isDark ? "Mode Terang" : "Mode Gelap"}
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => scrollTo("api-settings")}
          >
            {apiConfigured ? (
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
            ) : (
              <Key className="w-4 h-4 mr-2" />
            )}
            {apiConfigured ? "Ubah API Key" : "Konfigurasi API Key"}
          </Button>
          <Button
            className="w-full"
            size="sm"
            onClick={() => scrollTo("builder")}
          >
            Mulai Buat Resume
          </Button>
        </div>
      </div>
    </header>
  )
}
