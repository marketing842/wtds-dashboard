'use client'

import { useEffect, useState, use } from 'react'
import { apiFetch } from '@/lib/api'
import { Loader2, Save, KeyRound, Sparkles, Pencil, Trash2, ShieldCheck, Plug } from 'lucide-react'

const PROVIDERS = [
  {
    key: 'google_ads',
    label: 'Google Ads',
    color: '#FF4D00',
    fields: [
      { key: 'developer_token',     label: 'Developer Token',                    shared: true  },
      { key: 'oauth_client_id',     label: 'OAuth Client ID',                    shared: true  },
      { key: 'oauth_client_secret', label: 'OAuth Client Secret',                shared: true, secret: true },
      { key: 'refresh_token',       label: 'Refresh Token',       unique: true,  secret: true  },
      { key: 'mcc_id',              label: 'MCC Customer ID',                    shared: true  },
      { key: 'customer_id',         label: 'Ad Account Customer ID', unique: true },
    ],
  },
  {
    key: 'meta',
    label: 'Meta Ads',
    color: '#4F7EFF',
    fields: [
      { key: 'access_token',  label: 'Access Token',  unique: true, secret: true },
      { key: 'ad_account_id', label: 'Ad Account ID (act_...)', unique: true },
    ],
  },
  {
    key: 'ga4',
    label: 'Google Analytics 4',
    color: '#F59E0B',
    fields: [
      { key: 'property_id',         label: 'GA4 Property ID',     unique: true  },
      { key: 'oauth_client_id',     label: 'OAuth Client ID',      shared: true  },
      { key: 'oauth_client_secret', label: 'OAuth Client Secret',  shared: true, secret: true },
      { key: 'refresh_token',       label: 'Refresh Token',        unique: true, secret: true },
    ],
  },
  {
    key: 'search_console',
    label: 'Search Console',
    color: '#8B5CF6',
    fields: [
      { key: 'site_url',            label: 'Site URL (https://...)', unique: true },
      { key: 'oauth_client_id',     label: 'OAuth Client ID',        shared: true },
      { key: 'oauth_client_secret', label: 'OAuth Client Secret',    shared: true, secret: true },
      { key: 'refresh_token',       label: 'Refresh Token',          unique: true, secret: true },
    ],
  },
  {
    key: 'klaviyo',
    label: 'Klaviyo',
    color: '#10B981',
    fields: [
      { key: 'api_key', label: 'API Key (pk_...)', unique: true, secret: true },
      { key: 'conversion_metric_id', label: 'Conversion metric ID (optional — auto-detects Placed Order)', unique: true, secret: false },
    ],
  },
]

function SectionHeader({ icon: Icon, title, subtitle, color = 'var(--accent)' }: {
  icon: React.ElementType; title: string; subtitle?: string; color?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color === 'var(--accent)' ? 'var(--accent-soft)' : `${color}15`, border: `1px solid ${color === 'var(--accent)' ? 'var(--accent-border)' : `${color}30`}` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  )
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [client, setClient] = useState<{ name: string; slug: string; initial: string } | null>(null)
  const [creds, setCreds]   = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit client info
  const [editName, setEditName]       = useState('')
  const [editSlug, setEditSlug]       = useState('')
  const [editInitial, setEditInitial] = useState('')
  const [savingInfo, setSavingInfo]   = useState(false)
  const [infoSaved, setInfoSaved]     = useState(false)
  const [infoError, setInfoError]     = useState<string | null>(null)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]                   = useState(false)

  // Client login
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [savingLogin, setSavingLogin]     = useState(false)
  const [loginSaved, setLoginSaved]       = useState(false)
  const [loginError, setLoginError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [clientRes, credsRes, loginRes, defaultsRes] = await Promise.all([
        apiFetch(`/api/admin/clients/${id}`),
        apiFetch(`/api/admin/clients/${id}/credentials`),
        apiFetch(`/api/admin/clients/${id}/login`),
        apiFetch('/api/admin/defaults'),
      ])

      if (clientRes.ok) {
        const c = await clientRes.json()
        setClient(c)
        setEditName(c.name)
        setEditSlug(c.slug ?? '')
        setEditInitial(c.initial)
      }
      if (loginRes.ok) setLoginEmail((await loginRes.json()).email ?? '')

      const map: Record<string, Record<string, string>> = {}
      if (credsRes.ok) {
        const data: Array<{ provider: string; credentials: Record<string, string> }> = await credsRes.json()
        for (const row of data) map[row.provider] = { ...row.credentials }
      }

      if (defaultsRes.ok) {
        const defaults: Record<string, Record<string, string>> = await defaultsRes.json()
        for (const [provider, defs] of Object.entries(defaults)) {
          if (!map[provider]) map[provider] = {}
          for (const [key, val] of Object.entries(defs)) {
            if (!map[provider][key]) map[provider][key] = val
          }
        }
      }

      setCreds(map)
      setLoading(false)
    }
    load()
  }, [id])

  function setField(provider: string, key: string, value: string) {
    setCreds(prev => ({ ...prev, [provider]: { ...(prev[provider] ?? {}), [key]: value } }))
  }

  async function saveInfo() {
    if (!editName || !editSlug || !editInitial) { setInfoError('All fields are required'); return }
    setSavingInfo(true); setInfoError(null)
    try {
      const res = await apiFetch(`/api/admin/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, slug: editSlug, initial: editInitial }),
      })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Failed') }
      setClient(prev => prev ? { ...prev, name: editName, slug: editSlug, initial: editInitial } : prev)
      setInfoSaved(true); setTimeout(() => setInfoSaved(false), 2500)
    } catch (err: any) {
      setInfoError(err.message)
    } finally {
      setSavingInfo(false)
    }
  }

  async function deleteClient() {
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Failed') }
      window.location.href = '/admin'
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
      setDeleting(false)
    }
  }

  async function saveProvider(providerKey: string) {
    setSaving(providerKey)
    try {
      const res = await apiFetch(`/api/admin/clients/${id}/credentials/${providerKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds[providerKey] ?? {}),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(providerKey); setTimeout(() => setSaved(null), 2000)
    } catch {
      alert('Failed to save credentials.')
    } finally {
      setSaving(null)
    }
  }

  async function saveLogin() {
    if (!loginEmail || !loginPassword) { setLoginError('Email and password are required'); return }
    setSavingLogin(true); setLoginError(null)
    try {
      const res = await apiFetch(`/api/admin/clients/${id}/login`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Failed') }
      setLoginPassword(''); setLoginSaved(true); setTimeout(() => setLoginSaved(false), 2500)
    } catch (err: any) {
      setLoginError(err.message)
    } finally {
      setSavingLogin(false)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-3 py-20">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
      <span style={{ color: 'var(--text-muted)' }}>Loading client…</span>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Client identity hero ── */}
      <div className="card flex items-center gap-5"
        style={{ background: 'var(--surface)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 8px 24px rgba(255,77,0,0.30)' }}>
          {client?.initial}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-black leading-none" style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            {editName || client?.name}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Client Settings
          </p>
        </div>
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }}>
            <Sparkles className="w-3 h-3" />
            Auto-filled
          </div>
          <div className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            ↙ unique
          </div>
        </div>
      </div>

      {/* ── Client Info ── */}
      <section className="card">
        <SectionHeader icon={Pencil} title="Client Info" subtitle="Business name, URL slug and avatar initial" />

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Business Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="Spotlezz" className="input-row" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
                style={{ color: 'var(--text-muted)' }}>URL Slug</label>
              <input value={editSlug} onChange={e => setEditSlug(e.target.value)}
                placeholder="spotlezz" className="input-row" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Initial</label>
              <input value={editInitial}
                onChange={e => setEditInitial(e.target.value.toUpperCase().slice(0, 1))}
                placeholder="S" maxLength={1}
                className="input-row text-center font-black text-lg" />
            </div>
          </div>
        </div>

        {infoError && (
          <p className="mt-3 text-sm px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {infoError}
          </p>
        )}

        <div className="mt-4">
          <button onClick={saveInfo} disabled={savingInfo}
            className={infoSaved ? 'btn-secondary' : 'btn-primary'}
            style={infoSaved ? { borderColor: 'rgba(34,197,94,0.35)', color: '#16a34a', background: 'rgba(34,197,94,0.08)' } : { opacity: savingInfo ? 0.7 : 1 }}>
            {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {infoSaved ? 'Saved!' : 'Save Info'}
          </button>
        </div>
      </section>

      {/* ── Client Login ── */}
      <section className="card">
        <SectionHeader icon={KeyRound} title="Client Login" subtitle={`Email and password for the client portal at /login`} />

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Login Email</label>
            <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
              placeholder="client@company.com" className="input-row" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.08em] mb-1.5"
              style={{ color: 'var(--text-muted)' }}>
              New Password
              <span className="ml-2 normal-case font-normal tracking-normal" style={{ color: 'var(--text-subtle)' }}>
                — leave blank to keep current
              </span>
            </label>
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              placeholder="Set or update password" className="input-row" />
          </div>
        </div>

        {loginError && (
          <p className="mt-3 text-sm px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {loginError}
          </p>
        )}

        <div className="mt-4">
          <button onClick={saveLogin} disabled={savingLogin}
            className={loginSaved ? 'btn-secondary' : 'btn-primary'}
            style={loginSaved ? { borderColor: 'rgba(34,197,94,0.35)', color: '#16a34a', background: 'rgba(34,197,94,0.08)' } : { opacity: savingLogin ? 0.7 : 1 }}>
            {savingLogin ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loginSaved ? 'Saved!' : 'Save Login'}
          </button>
        </div>
      </section>

      {/* ── API Credentials ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
            <Plug className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>API Credentials</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Connection tokens for each marketing platform
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {PROVIDERS.map(provider => (
            <div key={provider.key} className="card"
              style={{ borderLeft: `3px solid ${provider.color}`, paddingLeft: '1.25rem' }}>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: provider.color }} />
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{provider.label}</p>
                </div>
                <button onClick={() => saveProvider(provider.key)} disabled={saving === provider.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={saved === provider.key
                    ? { background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }
                    : { background: provider.color + '18', color: provider.color, border: `1px solid ${provider.color}35` }}>
                  {saving === provider.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saved === provider.key ? 'Saved!' : 'Save'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {provider.fields.map(field => (
                  <div key={field.key}>
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.07em] mb-1.5"
                      style={{ color: 'var(--text-muted)' }}>
                      {field.shared && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold normal-case tracking-normal"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }}>
                          <Sparkles className="w-2.5 h-2.5" />
                          auto
                        </span>
                      )}
                      {field.unique && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold normal-case tracking-normal"
                          style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          unique
                        </span>
                      )}
                      {field.label}
                    </label>
                    <input
                      type={field.secret ? 'password' : 'text'}
                      value={creds[provider.key]?.[field.key] ?? ''}
                      onChange={e => setField(provider.key, field.key, e.target.value)}
                      placeholder={field.secret ? '••••••••' : ''}
                      className="input-row"
                      style={{
                        background: field.shared ? 'rgba(34,197,94,0.04)' : 'var(--bg)',
                        borderColor: field.shared ? 'rgba(34,197,94,0.25)' : 'var(--border)',
                        fontFamily: field.secret ? 'monospace' : undefined,
                      }}
                      onFocus={e => (e.target.style.borderColor = provider.color)}
                      onBlur={e => (e.target.style.borderColor = field.shared ? 'rgba(34,197,94,0.25)' : 'var(--border)')}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section className="card" style={{ border: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444' }}>
        <SectionHeader icon={Trash2} title="Danger Zone" subtitle="Permanent and irreversible actions" color="#ef4444" />

        <div className="flex items-center justify-between gap-6 pt-1">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Delete this client</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Removes the client record and all API credentials permanently.
            </p>
          </div>

          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}>
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold" style={{ color: '#ef4444' }}>Are you sure?</span>
              <button onClick={deleteClient} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: '#ef4444', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Yes, delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-secondary">
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
