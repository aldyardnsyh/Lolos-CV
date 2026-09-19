"use client"

import { Sparkles, Github, Twitter, Instagram, Linkedin } from "lucide-react"

export function Footer() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                Lolos<span className="text-primary">CV</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              Platform pembuatan CV yang membantu kamu lolos seleksi ATS.
              Analisis lowongan, optimalkan skor, dan buat CV yang menonjol.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Fitur</h4>
            <ul className="space-y-3">
              {[
                { label: "CV Builder", id: "builder" },
                { label: "Job Analyzer", id: "job-analyzer" },
                { label: "ATS Optimizer", id: "ats-optimizer" },
                { label: "Template CV", id: "templates" },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => scrollTo(item.id)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Sumber Lowongan</h4>
            <ul className="space-y-3">
              {[
                { name: "LinkedIn", url: "https://linkedin.com" },
                { name: "JobStreet", url: "https://jobstreet.com" },
                { name: "Glints", url: "https://glints.com" },
                { name: "Indeed", url: "https://indeed.com" },
              ].map((item) => (
                <li key={item.name}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} LolosCV. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {[
              { icon: Github, href: "https://github.com" },
              { icon: Twitter, href: "https://twitter.com" },
              { icon: Instagram, href: "https://instagram.com" },
              { icon: Linkedin, href: "https://linkedin.com" },
            ].map(({ icon: Icon, href }, i) => (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={["GitHub", "Twitter", "Instagram", "LinkedIn"][i]}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
