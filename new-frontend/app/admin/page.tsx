'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'
import { Users, Plus, Loader2, ChevronRight, Calendar } from 'lucide-react'

interface Client {
  id: string
  name: string
  initial: string
  created_at: string
}

export default function AdminOverviewPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/admin/clients')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setClients(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl page-in">

      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--accent)' }}>
            Agency
          </p>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: '2rem',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            CLIENT ACCOUNTS
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            {loading ? '—' : `${clients.length} active client${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/admin/clients" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Client
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-3 py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading clients…</span>
        </div>

      ) : clients.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg)', border: '2px dashed var(--border)' }}>
            <Users className="w-7 h-7" style={{ color: 'var(--text-subtle)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>No clients yet</p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>
            Add your first client to get started.
          </p>
          <Link href="/admin/clients" className="btn-primary">
            <Plus className="w-4 h-4" /> Add First Client
          </Link>
        </div>

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((c, idx) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="group hover:no-underline fade-in-up block rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                animationDelay: `${idx * 60}ms`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,77,0,0.1)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              {/* Top accent strip */}
              <div className="h-0.5 w-full transition-all duration-200"
                style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />

              <div className="p-4 flex items-center gap-4">
                {/* Avatar with status dot */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white accent-glow"
                    style={{ background: 'var(--accent)' }}
                  >
                    {c.initial}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: '#22c55e', borderColor: 'var(--surface)' }} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-base leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {c.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                      Active
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>·</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA arrow */}
                <div className="flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    }}
                  >
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
