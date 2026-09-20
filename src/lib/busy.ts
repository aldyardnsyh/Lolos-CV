"use client"

import { useEffect, useState } from "react"

// Bus "sedang sibuk" global: setiap proses panjang (generate, download,
// translate, analisis AI) mendorong label ke stack saat mulai dan
// mencabutnya saat selesai — walau komponennya berbeda. GlobalBusyBar
// menampilkan label teratas + progress bar sampai stack kosong.

const EVENT_NAME = "global_busy_changed"

let stack: string[] = []
const listeners = new Set<(v: string[]) => void>()

function emit() {
  const snap = [...stack]
  listeners.forEach((fn) => fn(snap))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: snap }))
  }
}

export function pushBusy(label: string): () => void {
  stack.push(label)
  emit()
  let done = false
  return () => {
    if (done) return
    done = true
    const i = stack.lastIndexOf(label)
    if (i >= 0) stack.splice(i, 1)
    emit()
  }
}

export function useGlobalBusy(): string[] {
  const [labels, setLabels] = useState<string[]>(stack)

  useEffect(() => {
    const sync = (v: string[]) => setLabels(v)
    listeners.add(sync)
    setLabels([...stack])
    const onEvent = (e: Event) => {
      setLabels([...((e as CustomEvent<string[]>).detail ?? [])])
    }
    window.addEventListener(EVENT_NAME, onEvent)
    return () => {
      listeners.delete(sync)
      window.removeEventListener(EVENT_NAME, onEvent)
    }
  }, [])

  return labels
}
