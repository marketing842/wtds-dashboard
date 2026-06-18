'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Loader2, UserPlus } from 'lucide-react'

export default function AddClientPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [slug, setSlug]         = useState('')
  const [initial, setInitial]   = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function handleNameChange(v: string) {
    setName(v)
    if (!slug)    setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    if (!initial) setInitial(v[0]?.toUpperCase() ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await apiFetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, initial, email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const { id } = await res.json()
      router.push(`/admin/clients/${id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--accent)' }}>
          New Account
        </p>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: '2rem',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          ADD CLIENT
        </h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Creates the client record and their first login account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">

        {/* Business details */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 pb-3"
            style={{ color: 'var(--text-subtle)', borderBottom: '1px solid var(--border)' }}>
            Business Details
          </p>
          <div className="space-y-4">
            <Field label="Business Name" required>
              <input value={name} onChange={e => handleNameChange(e.target.value)}
                placeholder="Spotlezz" required className="input-row" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="URL Slug" hint="Internal reference" required>
                  <input value={slug} onChange={e => setSlug(e.target.value)}
                    placeholder="spotlezz" pattern="[a-z0-9-]+" required className="input-row" />
                </Field>
              </div>
              <Field label="Initial" hint="Avatar letter">
                <input value={initial}
                  onChange={e => setInitial(e.target.value.toUpperCase().slice(0, 1))}
                  placeholder="S" maxLength={1} className="input-row text-center font-black text-lg" />
              </Field>
            </div>
          </div>
        </div>

        {/* Login account */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4 pb-3"
            style={{ color: 'var(--text-subtle)', borderBottom: '1px solid var(--border)' }}>
            First Login Account
          </p>
          <div className="space-y-4">
            <Field label="Email" required>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="client@company.com" required className="input-row" />
            </Field>
            <Field label="Password" required>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" minLength={8} required className="input-row" />
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Create Client
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
        style={{ color: 'var(--text-muted)' }}>
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
        {hint && <span className="ml-2 normal-case font-normal tracking-normal" style={{ color: 'var(--text-subtle)' }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}
