'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { Lang, translations } from './translations'
import { makeFormatters } from './format'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
  locale: string
  fmt: (n: number, decimals?: number) => string
  fmtEur: (n: number) => string
  fmtPct: (n: number, decimals?: number) => string
  fmtK: (n: number, decimals?: number) => string
  shortDate: (iso: string) => string
  formatDate: (ts: string) => string
  monthLabel: (d: Date, withYear?: boolean) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'nl',
  setLang: () => {},
  t: (key) => key,
  locale: 'nl-NL',
  fmt: (n) => String(n),
  fmtEur: (n) => `€${n}`,
  fmtPct: (n) => `${n}%`,
  fmtK: (n) => String(n),
  shortDate: (iso) => iso,
  formatDate: (ts) => ts,
  monthLabel: () => '',
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('nl')

  useEffect(() => {
    const stored = localStorage.getItem('dashboard-lang')
    if (stored === 'en' || stored === 'nl') setLangState(stored)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('dashboard-lang', l)
  }, [])

  const t = useCallback((key: string): string => {
    return translations[lang][key] ?? translations.en[key] ?? key
  }, [lang])

  const formatters = useMemo(() => makeFormatters(lang), [lang])

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    t,
    locale: formatters.locale,
    fmt: formatters.fmt,
    fmtEur: formatters.fmtEur,
    fmtPct: formatters.fmtPct,
    fmtK: formatters.fmtK,
    shortDate: formatters.shortDate,
    formatDate: formatters.formatDate,
    monthLabel: formatters.monthLabel,
  }), [lang, setLang, t, formatters])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
