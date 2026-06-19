'use client'

import {
  Target, TrendingUp, Users, Mail,
  BarChart3, Globe, Search, Camera, LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClientInfo } from '@/lib/client-context'
import { clearToken } from '@/lib/auth'

const NAV = [
  { href: '/',               label: 'Dashboard',  icon: BarChart3  },
  { href: '/campaigns',      label: 'Campaigns',  icon: Target     },
  { href: '/analytics',      label: 'Analytics',  icon: TrendingUp },
  { href: '/audiences',      label: 'Audiences',  icon: Users      },
  { href: '/email',          label: 'Email',      icon: Mail       },
  { href: '/meta',           label: 'Meta Ads',   icon: Globe      },
  { href: '/meta-organisch', label: 'Organisch',  icon: Camera     },
  { href: '/search-console', label: 'Search',     icon: Search     },
]

export function Sidebar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const clientInfo = useClientInfo()

  function handleSignOut() {
    clearToken()
    router.push('/login')
  }

  return (
    <aside
      className="w-64 h-screen fixed left-0 top-0 flex flex-col overflow-hidden"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
    >
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
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: '1.7rem',
              color: 'var(--accent)', lineHeight: 1,
              margin: '0 3px',
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
            Marketing Dashboard
          </p>
        </Link>
      </div>

      {/* ── Client identity card ───────────────────── */}
      <div className="relative z-10 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(255,77,0,0.35)' }}
          >
            {clientInfo?.initial ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-none" style={{ color: 'var(--text-primary)' }}>
              {clientInfo?.name ?? '—'}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.75)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: 'var(--text-subtle)' }}>
                Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav label ─────────────────────────────── */}
      <div className="relative z-10 px-5 mb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-subtle)' }}>
          Navigation
        </p>
      </div>

      {/* ── Nav items ─────────────────────────────── */}
      <nav className="relative z-10 flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={active ? {
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(255,77,0,0.28)',
              } : {
                background: 'transparent',
                color: 'var(--text-muted)',
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
              <span>{label}</span>
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

      {/* ── Sign Out ──────────────────────────────── */}
      <div className="relative z-10 px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
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
          Sign Out
        </button>
      </div>
    </aside>
  )
}
