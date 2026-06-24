'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LayoutDashboard, Eye, EyeOff, BarChart3, Globe, Mail, Search, TrendingUp } from 'lucide-react'
import { setToken } from '@/lib/auth'
import { ModeToggle } from '@/components/ModeToggle'
import { useLanguage } from '@/lib/language-context'
import { LanguageToggle } from '@/components/LanguageToggle'

const API   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const COLOR = '#FF4D00'

const PLATFORM_KEYS = [
  { key: 'login.platform.googleAds',  icon: BarChart3  },
  { key: 'login.platform.metaAds',    icon: Globe      },
  { key: 'login.platform.email',      icon: Mail       },
  { key: 'login.platform.analytics',  icon: TrendingUp },
  { key: 'login.platform.seo',        icon: Search     },
] as const

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok || data.role === 'admin') { setError(t('login.errorInvalid')); setLoading(false); return }
      setToken(data.token)
      router.push('/')
    } catch {
      setError(t('login.errorGeneric'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ─── Left branding panel (desktop only) ─────────── */}
      <div
        className="hidden lg:flex w-[46%] relative flex-col justify-between p-14 overflow-hidden select-none"
        style={{ background: 'linear-gradient(155deg, #0A0A0A 0%, #1C1C1C 60%, #0A0A0A 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,77,0,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.35,
          }} />

        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,77,0,0.12), transparent 65%)' }} />
        <div className="absolute bottom-0 -right-20 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,77,0,0.08), transparent 70%)' }} />

        <div className="relative z-10">
          <div className="flex items-baseline gap-0.5">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.75rem', letterSpacing: '-0.03em', color: '#FAFAFA', lineHeight: 1 }}>
              WHAT THE
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '3rem', color: COLOR, lineHeight: 1, margin: '0 5px' }}>
              *
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.75rem', letterSpacing: '-0.03em', color: '#FAFAFA', lineHeight: 1 }}>
              DS
            </span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,77,0,0.12)', border: '1px solid rgba(255,77,0,0.35)' }}>
            <LayoutDashboard className="w-3.5 h-3.5" style={{ color: COLOR }} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: COLOR }}>
              {t('login.portal')}
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.5rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#FAFAFA', marginBottom: '16px' }}>
            {t('login.tagline')}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'rgba(250,250,250,0.45)', lineHeight: 1.7 }}>
            {t('login.subtitle')}
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            {PLATFORM_KEYS.map(({ key, icon: Icon }) => (
              <div key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon className="w-3 h-3" style={{ color: 'rgba(250,250,250,0.35)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(250,250,250,0.45)' }}>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: 'rgba(250,250,250,0.2)' }}>
          © 2026 What The * DS
        </p>
      </div>

      {/* ─── Right form panel ────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>

        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex lg:hidden items-baseline gap-0.5">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>WHAT THE</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.75rem', color: COLOR, lineHeight: 1, margin: '0 3px' }}>*</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>DS</span>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ModeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 pb-16">
          <div className="w-full max-w-[380px]">

            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
                style={{ background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.25)' }}>
                <LayoutDashboard className="w-3 h-3" style={{ color: COLOR }} />
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: COLOR }}>
                  {t('login.portal')}
                </span>
              </div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {t('login.welcome')}
              </h1>
              <p style={{ fontSize: '0.875rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                {t('login.signInDesc')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.09em] mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  {t('login.email')}
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="jij@bedrijf.nl"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = COLOR; e.target.style.boxShadow = '0 0 0 3px rgba(255,77,0,0.12)' }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.09em] mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password" placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                    style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={e => { e.target.style.borderColor = COLOR; e.target.style.boxShadow = '0 0 0 3px rgba(255,77,0,0.12)' }}
                    onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all"
                style={{
                  background: loading ? 'var(--text-subtle)' : COLOR,
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(255,77,0,0.35)',
                }}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.signingIn')}</>
                  : t('login.signIn')}
              </button>
            </form>

            <p className="text-center text-xs mt-8" style={{ color: 'var(--text-subtle)' }}>
              {t('login.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
