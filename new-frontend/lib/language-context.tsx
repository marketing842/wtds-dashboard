'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Lang, translations } from './translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'nl',
  setLang: () => {},
  t: (key) => key,
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
    return translations[lang][key] ?? translations['en'][key] ?? key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
