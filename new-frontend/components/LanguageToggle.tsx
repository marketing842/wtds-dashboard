'use client'

import { useLanguage } from '@/lib/language-context'

interface LanguageToggleProps {
  /** sidebar = full-width in nav; inline = compact for login headers */
  variant?: 'sidebar' | 'inline'
}

export function LanguageToggle({ variant = 'sidebar' }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage()

  const isInline = variant === 'inline'

  return (
    <div className={isInline ? 'flex-shrink-0' : 'relative z-10 px-3 pb-3'}>
      <div
        className={`flex items-center gap-0.5 rounded-xl ${isInline ? 'p-0.5' : 'px-1 py-1'}`}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        role="group"
        aria-label="Language"
      >
        {(['nl', 'en'] as const).map(code => {
          const active = lang === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={active}
              className={`text-xs font-bold rounded-lg transition-all duration-150 ${
                isInline ? 'min-w-[2.25rem] px-2 py-1.5' : 'flex-1 py-1.5'
              }`}
              style={active ? {
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(255,77,0,0.28)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
              }}
            >
              {code.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
