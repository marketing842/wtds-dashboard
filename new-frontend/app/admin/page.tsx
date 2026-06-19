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
              className="stat-card group flex items-center gap-4 hover:no-underline fade-in-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0 accent-glow"
                style={{ background: 'var(--accent)' }}
              >
                {c.initial}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base truncate" style={{ color: 'var(--text-primary)' }}>
                  {c.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Added {new Date(c.created_at).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              </div>

              {/* Hover CTA */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  Edit <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
