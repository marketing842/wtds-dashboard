'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--border)' }} />
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
      style={{
        background:  'var(--bg)',
        border:      '1px solid var(--border)',
        color:       'var(--text-muted)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = 'var(--accent)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
        ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLElement).style.background = 'var(--bg)'
      }}
    >
      {isDark
        ? <Sun  className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}
