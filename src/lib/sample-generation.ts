"use client"

import { useEffect, useState } from "react"

const EVENT_NAME = "sample_generation_changed"

let globalGenerating = false
const listeners = new Set<(v: boolean) => void>()

export function setSampleGenerating(v: boolean) {
  if (globalGenerating === v) return
  globalGenerating = v
  listeners.forEach((fn) => fn(v))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: v }))
  }
}

export function isSampleGenerating() {
  return globalGenerating
}

export function useSampleGenerating(): [boolean, (v: boolean) => void] {
  const [generating, setGenerating] = useState(globalGenerating)

  useEffect(() => {
    const sync = (v: boolean) => setGenerating(v)
    listeners.add(sync)
    setGenerating(globalGenerating)
    const onEvent = (e: Event) => {
      setGenerating((e as CustomEvent<boolean>).detail ?? globalGenerating)
    }
    window.addEventListener(EVENT_NAME, onEvent)
    return () => {
      listeners.delete(sync)
      window.removeEventListener(EVENT_NAME, onEvent)
    }
  }, [])

  return [generating, setSampleGenerating]
}
