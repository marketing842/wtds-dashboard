'use client'

import { useLanguage } from '@/lib/language-context'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="relative z-10 px-3 pb-3">
      <div className="flex items-center gap-1 px-1 py-1 rounded-xl"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setLang('nl')}
          className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all duration-150"
          style={lang === 'nl' ? {
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(255,77,0,0.28)',
          } : {
            background: 'transparent',
            color: 'var(--text-muted)',
          }}
        >
          NL
        </button>
        <button
          onClick={() => setLang('en')}
          className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all duration-150"
          style={lang === 'en' ? {
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(255,77,0,0.28)',
          } : {
            background: 'transparent',
            color: 'var(--text-muted)',
          }}
        >
          EN
        </button>
      </div>
    </div>
  )
}
