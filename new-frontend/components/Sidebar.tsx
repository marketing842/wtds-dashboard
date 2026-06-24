'use client'

import {
  Target, TrendingUp, Mail,
  BarChart3, Globe, Search, Camera, LogOut, Menu, X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClientInfo } from '@/lib/client-context'
import { clearToken } from '@/lib/auth'
import { useLanguage } from '@/lib/language-context'
import { LanguageToggle } from '@/components/LanguageToggle'

const NAV = [
  { href: '/',               key: 'sidebar.nav.dashboard',  icon: BarChart3  },
  { href: '/campaigns',      key: 'sidebar.nav.campaigns',  icon: Target     },
  { href: '/analytics',      key: 'sidebar.nav.analytics',  icon: TrendingUp },
  { href: '/email',          key: 'sidebar.nav.email',      icon: Mail       },
  { href: '/meta',           key: 'sidebar.nav.meta',       icon: Globe      },
  { href: '/meta-organisch', key: 'sidebar.nav.organisch',  icon: Camera     },
  { href: '/search-console', key: 'sidebar.nav.search',     icon: Search     },
]

export function Sidebar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const clientInfo = useClientInfo()
  const { t }      = useLanguage()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false) }, [pathname])

  function handleSignOut() {
    clearToken()
    router.push('/login')
  }

  return (
    <>
    {/* ── Mobile hamburger (hidden on desktop) ───── */}
    <button
      onClick={() => setOpen(true)}
      aria-label="Open menu"
      className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      <Menu className="w-5 h-5" />
    </button>

    {/* ── Backdrop when drawer is open (mobile) ──── */}
    {open && (
      <div
        onClick={() => setOpen(false)}
        className="lg:hidden fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      />
    )}

    <aside
      className={`w-64 h-screen fixed left-0 top-0 z-50 flex flex-col overflow-hidden transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Close button (mobile only) ────────────── */}
      <button
        onClick={() => setOpen(false)}
        aria-label="Close menu"
        className="lg:hidden absolute top-4 right-4 z-20 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 40% 0%, rgba(255,77,0,0.07) 0%, transparent 70%)' }} />

      {/* ── Brand ─────────────────────────────────── */}
      <div className="relative z-10 px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="block group">
          <div className="flex items-baseline gap-0.5">
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: '1.5rem',
              letterSpacing: '-0.03em', lineHeight: 1,
              color: 'var(--text-primary)',
            }}>
              WHAT THE
            </span>
            <span className="float" style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: '1.7rem',
              color: 'var(--accent)', lineHeight: 1,
              margin: '0 3px',
              display: 'inline-block',
            }}>
              *
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: '1.5rem',
              letterSpacing: '-0.03em', lineHeight: 1,
              color: 'var(--text-primary)',
            }}>
              DS
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] mt-1"
            style={{ color: 'var(--text-subtle)' }}>
            {t('sidebar.marketingDashboard')}
          </p>
        </Link>
      </div>

      {/* ── Client identity card ───────────────────── */}
      <div className="relative z-10 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0 accent-glow"
            style={{ background: 'var(--accent)' }}
          >
            {clientInfo?.initial ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-none" style={{ color: 'var(--text-primary)' }}>
              {clientInfo?.name ?? '—'}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 live-pulse"
                style={{ background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.75)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: 'var(--text-subtle)' }}>
                {t('sidebar.live')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav label ─────────────────────────────── */}
      <div className="relative z-10 px-5 mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-subtle)' }}>
          {t('sidebar.navigation')}
        </p>
      </div>

      {/* ── Nav items ─────────────────────────────── */}
      <nav className="relative z-10 flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, key, icon: Icon }, idx) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 slide-in-left"
              style={active ? {
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(255,77,0,0.28)',
                animationDelay: `${idx * 45}ms`,
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
                animationDelay: `${idx * 45}ms`,
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? 'rgba(255,255,255,0.9)' : 'inherit' }}
              />
              <span>{t(key)}</span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.7)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Language Toggle ───────────────────────── */}
      <LanguageToggle />

      {/* ── Sign Out ──────────────────────────────── */}
      <div className="relative z-10 px-3 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {t('sidebar.signOut')}
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
