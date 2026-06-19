'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LayoutDashboard, Eye, EyeOff, BarChart3, Globe, Mail, Search, TrendingUp } from 'lucide-react'
import { setToken } from '@/lib/auth'
import { ModeToggle } from '@/components/ModeToggle'

const API    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const COLOR  = '#6366f1'
const COLOR2 = '#818cf8'

const PLATFORMS = [
  { label: 'Google Ads',  icon: BarChart3  },
  { label: 'Meta Ads',    icon: Globe      },
  { label: 'Email',       icon: Mail       },
  { label: 'Analytics',   icon: TrendingUp },
  { label: 'Search',      icon: Search     },
]

export default function LoginPage() {
  const router = useRouter()
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
      if (!res.ok || data.role === 'admin') { setError('Invalid email or password.'); setLoading(false); return }
      setToken(data.token)
      router.push('/')
    } catch {
      setError('Unable to sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ─── Left branding panel (desktop only) ─────────── */}
      <div
        className="hidden lg:flex w-[46%] relative flex-col justify-between p-14 overflow-hidden select-none"
        style={{ background: 'linear-gradient(155deg, #0b0d18 0%, #0f1120 60%, #0d0f1a 100%)' }}
      >
        {/* Dot-grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.4,
          }} />

        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${COLOR}22, transparent 65%)` }} />
        <div className="absolute bottom-0 -right-20 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${COLOR}16, transparent 70%)` }} />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-baseline gap-0.5">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.75rem', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
              WHAT THE
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '3rem', color: COLOR, lineHeight: 1, margin: '0 5px' }}>
              *
            </span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.75rem', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
              DS
            </span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)' }}>
            <LayoutDashboard className="w-3.5 h-3.5" style={{ color: COLOR2 }} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: COLOR2 }}>
              Client Portal
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.5rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', marginBottom: '16px' }}>
            YOUR MARKETING,<br />ONE DASHBOARD.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#4a5070', lineHeight: 1.7 }}>
            Real-time insights from every channel —<br />connected, clear, and always up to date.
          </p>

          {/* Platform pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {PLATFORMS.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon className="w-3 h-3" style={{ color: '#4a5070' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#5a6080' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs" style={{ color: '#1e2140' }}>
          © 2026 What The * DS
        </p>
      </div>

      {/* ─── Right form panel ────────────────────────────── */}
      <div className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-baseline gap-0.5">
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>WHAT THE</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.75rem', color: COLOR, lineHeight: 1, margin: '0 3px' }}>*</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>DS</span>
          </div>
          <div className="hidden lg:block" />
          <ModeToggle />
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-8 pb-16">
          <div className="w-full max-w-[380px]">

            {/* Heading */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <LayoutDashboard className="w-3 h-3" style={{ color: COLOR }} />
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: COLOR }}>
                  Client Portal
                </span>
              </div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                WELCOME BACK
              </h1>
              <p style={{ fontSize: '0.875rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                Sign in to your marketing dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.09em] mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="you@company.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => { e.target.style.borderColor = COLOR; e.target.style.boxShadow = `0 0 0 3px rgba(99,102,241,0.12)` }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.09em] mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password" placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                    style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
                    onFocus={e => { e.target.style.borderColor = COLOR; e.target.style.boxShadow = `0 0 0 3px rgba(99,102,241,0.12)` }}
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
                  boxShadow: loading ? 'none' : `0 4px 20px rgba(99,102,241,0.35)`,
                }}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  : 'Sign In'}
              </button>
            </form>

            {/* Footer note */}
            <p className="text-center text-xs mt-8" style={{ color: 'var(--text-subtle)' }}>
              Secure client access · What The * DS Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
