'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Users, Target, Loader2 } from 'lucide-react'

import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'

function fmt(n: number) {
  return n.toLocaleString('nl-NL')
}

function timeAgo(dateStr: string, t: (k: string) => string) {
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.round((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return t('time.today')
  if (days === 1) return t('time.yesterday')
  if (days < 30) return `${days}${t('time.daysAgo')}`
  const months = Math.floor(days / 30)
  return `${months}${t('time.monthsAgo')}`
}

export default function AudiencesPage() {
  const [lists, setLists] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    apiFetch(`/api/klaviyo/lists`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const klaviyoDetail = body?.detail?.errors?.[0]?.detail ?? body?.detail?.errors?.[0]?.title
          throw new Error(klaviyoDetail ?? body?.error ?? `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        setLists(data.lists ?? [])
        setSegments(data.segments ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalMembers = lists.reduce((s, l) => s + (l.profile_count ?? 0), 0)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header title={t('audiences.title')} description={t('audiences.desc')} showDatePicker={false} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 page-in">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">{t('audiences.loading')}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Note — list sizes are always current */}
                <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg text-xs text-muted-foreground"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="text-accent font-bold">ℹ</span>
                  {t('audiences.note')}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="stat-card flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">{t('audiences.stat.emailLists')}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{lists.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-accent opacity-60" />
                  </div>
                  <div className="stat-card flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">{t('audiences.stat.totalMembers')}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {totalMembers > 0 ? fmt(totalMembers) : '—'}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-emerald-700 dark:text-emerald-400 opacity-60" />
                  </div>
                  <div className="stat-card flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">{t('audiences.stat.segments')}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{segments.length}</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-700 dark:text-blue-400 opacity-60" />
                  </div>
                </div>

                {/* Lists */}
                <div className="mb-8">
                  <p className="text-foreground font-bold text-lg mb-4">{t('audiences.emailLists')}</p>
                  {lists.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('audiences.noLists')}</p>
                  ) : (
                    <div className="stat-card p-0 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">{t('audiences.table.listName')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('audiences.table.members')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3">{t('audiences.table.lastUpdated')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lists.map((l, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors">
                              <td className="px-5 py-3 text-foreground font-medium">{l.name}</td>
                              <td className="px-4 py-3 text-right text-accent font-bold">
                                {l.profile_count != null ? fmt(l.profile_count) : '—'}
                              </td>
                              <td className="px-5 py-3 text-right text-muted-foreground text-xs">{timeAgo(l.updated, t)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Segments */}
                {segments.length > 0 && (
                  <div>
                    <p className="text-foreground font-bold text-lg mb-4">{t('audiences.segments')}</p>
                    <div className="stat-card p-0 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">{t('audiences.table.segmentName')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3">{t('audiences.table.lastUpdated')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {segments.map((s, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors">
                              <td className="px-5 py-3 text-foreground font-medium">{s.name}</td>
                              <td className="px-5 py-3 text-right text-muted-foreground text-xs">{timeAgo(s.updated, t)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
