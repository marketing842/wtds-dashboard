'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, LogOut, Users, UserPlus, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { ModeToggle } from '@/components/ModeToggle'
import { clearToken, getTokenPayload } from '@/lib/auth'
import { useLanguage } from '@/lib/language-context'
import { LanguageToggle } from '@/components/LanguageToggle'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const isLoginPage = pathname === '/admin/login'
  const { t } = useLanguage()

  function handleSignOut() {
    clearToken()
    router.push('/admin/login')
  }

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return }
    const payload = getTokenPayload()
    if (!payload || payload.role !== 'admin') {
      router.replace('/admin/login')
      return
    }
    setChecking(false)
  }, [router, isLoginPage])

  if (isLoginPage) return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  const navItems = [
    { href: '/admin',         label: t('admin.nav.allClients'), icon: Users    },
    { href: '/admin/clients', label: t('admin.nav.addClient'),  icon: UserPlus },
  ]

  const isClientDetail = pathname.startsWith('/admin/clients/')

  const pageTitle = (() => {
    if (pathname === '/admin') return t('admin.header.title.allClients')
    if (pathname === '/admin/clients') return t('admin.header.title.addClient')
    if (isClientDetail) return t('admin.header.title.editClient')
    return t('admin.admin')
  })()

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Admin Sidebar ─────────────────────────── */}
      <aside
        className="w-60 h-screen fixed left-0 top-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 40% 0%, rgba(255,77,0,0.09) 0%, transparent 70%)' }} />

        {/* Brand */}
        <div className="relative z-10 px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
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
              color: 'var(--accent)', lineHeight: 1, margin: '0 3px',
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
        </div>

        {/* Admin identity card */}
        <div className="relative z-10 px-4 pt-4 pb-3">
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {/* Accent strip */}
            <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
            <div className="flex items-center gap-3 px-3 py-3">
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center accent-glow"
                  style={{ background: 'var(--accent)' }}
                >
                  <ShieldCheck style={{ width: 20, height: 20, color: '#fff' }} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#22c55e', borderColor: 'var(--bg)' }} />
              </div>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-none mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {t('admin.admin')}
                </p>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--accent)' }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--accent)' }}>
                    {t('admin.agencyPanel')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div className="relative z-10 px-5 mb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--text-subtle)' }}>
            {t('admin.management')}
          </p>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }, idx) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 slide-in-left"
                style={active ? {
                  background: 'var(--accent)',
                  color: '#fff',
                  boxShadow: '0 4px 16px rgba(255,77,0,0.28)',
                  animationDelay: `${idx * 60}ms`,
                } : {
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  animationDelay: `${idx * 60}ms`,
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
                <Icon className="w-4 h-4 flex-shrink-0"
                  style={{ color: active ? 'rgba(255,255,255,0.9)' : 'inherit' }} />
                {label}
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

        {/* Language Toggle */}
        <LanguageToggle />

        {/* Sign Out */}
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

      {/* ── Main content ──────────────────────────── */}
      <div className="flex-1 ml-60 flex flex-col overflow-hidden">

        {/* Sticky header */}
        <header
          className="h-16 flex items-center justify-between px-8 sticky top-0 z-40"
          style={{
            background:   'var(--surface)',
            borderBottom: '1px solid var(--border)',
            boxShadow:    '0 1px 0 var(--border), 0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {isClientDetail ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{ color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('admin.header.clients')}
              </Link>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-subtle)' }} />
              <span
                className="leading-none"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900, fontSize: '1.75rem',
                  letterSpacing: '-0.025em', textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                }}
              >
                {pageTitle}
              </span>
            </div>
          ) : (
            <h1
              className="leading-none"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: '1.75rem',
                letterSpacing: '-0.025em', textTransform: 'uppercase',
                color: 'var(--text-primary)',
              }}
            >
              {pageTitle}
            </h1>
          )}

          <ModeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  )
}
