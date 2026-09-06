// ============================================
// BestWork - i18n (TR/EN)
// TR kaynak metinlerdir. EN seçilince görünen metinler sözlükle değiştirilir;
// TR'ye dönüşte sayfa yenilenir (metinler aslına döner). Eksik anahtar
// Türkçe kalır; hiçbir akış bozulmaz.
// ============================================
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { en } from '@/lib/lang-en'

type Lang = 'tr' | 'en'

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const Ctx = createContext<I18nCtx | undefined>(undefined)

const STORE_KEY = 'bw_lang'

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'tr'
  try {
    return localStorage.getItem(STORE_KEY) === 'en' ? 'en' : 'tr'
  } catch {
    return 'tr'
  }
}

/** Metin düğümlerini sözlüğe göre çevirir (kısa statik metinler). */
function translateTree(root: Node): number {
  let changes = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const val = node.nodeValue ?? ''
    const trimmed = val.trim()
    if (!trimmed || trimmed.length > 200) continue
    const replacement = en[trimmed]
    if (replacement !== undefined && replacement !== trimmed) {
      node.nodeValue = val.replace(trimmed, replacement)
      changes++
    }
  }
  return changes
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('tr')
  const applied = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLangState(initialLang())
    setReady(true)
  }, [])

  // EN'de: DOM'a uygula; sonradan gelen (dinamik) metinler için gözlemle.
  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = lang
    if (lang !== 'en') {
      applied.current = false
      return
    }
    const run = () => {
      if (applied.current) return
      applied.current = true
      const id = requestAnimationFrame(() => {
        translateTree(document.body)
        applied.current = false
      })
      window.setTimeout(() => cancelAnimationFrame(id), 1000)
    }
    run()

    let timer = 0
    const observer = new MutationObserver(() => {
      if (applied.current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        translateTree(document.body)
      }, 150)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [ready, lang])

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem(STORE_KEY, l)
    } catch {
      /* yoksay */
    }
    if (l === lang) return
    if (l === 'tr') {
      // Asıl metinlere dönüş: temiz yeniden yükleme
      window.location.reload()
      return
    }
    setLangState(l)
  }

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n, I18nProvider içinde kullanılmalıdır')
  return ctx
}
