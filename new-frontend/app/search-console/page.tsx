'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { MousePointerClick, Eye, TrendingUp, Search, Loader2 } from 'lucide-react'

import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

function positionStyle(pos: number): { color: string; fontWeight: number } {
  if (pos <= 3)  return { color: '#22C55E', fontWeight: 700 }
  if (pos <= 10) return { color: '#EAB308', fontWeight: 700 }
  return { color: 'var(--text-muted)', fontWeight: 600 }
}

function positionBadge(pos: number) {
  if (pos <= 3)  return '🥇'
  if (pos <= 10) return '✦'
  return null
}

function getPrevRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end)
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const pe = new Date(s); pe.setDate(pe.getDate() - 1)
  const ps = new Date(pe); ps.setDate(ps.getDate() - days + 1)
  return { ps: ps.toISOString().slice(0, 10), pe: pe.toISOString().slice(0, 10) }
}

function pctChg(a: number, b: number | null | undefined) {
  if (!b || b === 0) return null
  return ((a - b) / b) * 100
}

export default function SearchConsolePage() {
  const { startDate, endDate } = useDateRange()
  const [summary, setSummary] = useState<any>(null)
  const [queries, setQueries] = useState<any[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { ps, pe } = getPrevRange(startDate, endDate)
        const [sumRes, sumPrevRes, qRes, pRes] = await Promise.all([
          apiFetch(`/api/search-console/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/search-console/summary?start=${ps}&end=${pe}`),
          apiFetch(`/api/search-console/queries?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/search-console/pages?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${sumRes.status}`)
        }
        const [s, sp, q, p] = await Promise.all([
          sumRes.json(),
          sumPrevRes.ok ? sumPrevRes.json() : null,
          qRes.ok ? qRes.json() : [],
          pRes.ok ? pRes.json() : [],
        ])
        setSummary({ cur: s, prev: sp })
        setQueries(q)
        setPages(p)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [startDate, endDate])

  const cur = summary?.cur
  const prev = summary?.prev

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title="Search Console" description="Organic search performance for spotlezz.nl" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 page-in">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading Search Console…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error}
                {error.includes('refresh_token') && (
                  <span className="block mt-2 text-muted-foreground">
                    Run: <code className="text-accent">node scripts/search-console-oauth.js</code> in the backend folder, then restart.
                  </span>
                )}
              </div>
            )}

            {!loading && !error && cur && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard
                    label="Clicks"
                    value={cur.clicks >= 1000 ? `${fmt(cur.clicks / 1000)}K` : fmt(cur.clicks, 0)}
                    change={pctChg(cur.clicks, prev?.clicks) != null ? { value: Math.abs(pctChg(cur.clicks, prev?.clicks)!), isPositive: pctChg(cur.clicks, prev?.clicks)! >= 0 } : undefined}
                    icon={MousePointerClick}
                  />
                  <StatCard
                    label="Impressions"
                    value={cur.impressions >= 1000 ? `${fmt(cur.impressions / 1000)}K` : fmt(cur.impressions, 0)}
                    change={pctChg(cur.impressions, prev?.impressions) != null ? { value: Math.abs(pctChg(cur.impressions, prev?.impressions)!), isPositive: pctChg(cur.impressions, prev?.impressions)! >= 0 } : undefined}
                    icon={Eye}
                  />
                  <StatCard
                    label="Avg. CTR"
                    value={`${fmt(cur.ctr)}%`}
                    change={pctChg(cur.ctr, prev?.ctr) != null ? { value: Math.abs(pctChg(cur.ctr, prev?.ctr)!), isPositive: pctChg(cur.ctr, prev?.ctr)! >= 0 } : undefined}
                    icon={TrendingUp}
                  />
                  <StatCard
                    label="Avg. Position"
                    value={fmt(cur.position)}
                    change={pctChg(cur.position, prev?.position) != null ? { value: Math.abs(pctChg(cur.position, prev?.position)!), isPositive: pctChg(cur.position, prev?.position)! <= 0 } : undefined}
                    icon={Search}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top queries */}
                  <div>
                    <div className="mb-4">
                      <p className="text-foreground font-bold text-lg">Top Search Queries</p>
                      <p className="text-muted-foreground text-sm mt-1">{startDate} → {endDate} · <span style={{ color: '#22C55E' }}>🥇 top 3</span> · <span style={{ color: '#EAB308' }}>✦ top 10</span> · positie (lager = beter)</p>
                    </div>

                    <div className="stat-card p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Query</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Clicks</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Impr.</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">CTR</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Pos.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queries.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-sm py-10" style={{ color: 'var(--text-subtle)' }}>No search queries found for this period.</td></tr>
                          ) : queries.map((q, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 transition-colors" style={{ cursor: 'default' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-4 py-3 font-medium truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{q.query}</td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{q.clicks}</td>
                              <td className="px-4 py-3 text-right" style={{ color: 'var(--text-muted)' }}>{q.impressions >= 1000 ? `${fmt(q.impressions / 1000)}K` : q.impressions}</td>
                              <td className="px-4 py-3 text-right" style={{ color: 'var(--text-muted)' }}>{fmt(q.ctr)}%</td>
                              <td className="px-4 py-3 text-right">
                                <span style={positionStyle(q.position)}>
                                  {positionBadge(q.position) && <span className="mr-1 text-[10px]">{positionBadge(q.position)}</span>}
                                  {fmt(q.position)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top pages */}
                  <div>
                    <div className="mb-4">
                      <p className="text-foreground font-bold text-lg">Top Pages</p>
                      <p className="text-muted-foreground text-sm mt-1">{startDate} → {endDate}</p>
                    </div>

                    <div className="stat-card p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Page</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Clicks</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Impr.</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Pos.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-sm py-10" style={{ color: 'var(--text-subtle)' }}>No page data found for this period.</td></tr>
                          ) : pages.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 transition-colors" style={{ cursor: 'default' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-4 py-3 font-medium truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }}>
                                {p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{p.clicks}</td>
                              <td className="px-4 py-3 text-right" style={{ color: 'var(--text-muted)' }}>{p.impressions >= 1000 ? `${fmt(p.impressions / 1000)}K` : p.impressions}</td>
                              <td className="px-4 py-3 text-right">
                                <span style={positionStyle(p.position)}>
                                  {positionBadge(p.position) && <span className="mr-1 text-[10px]">{positionBadge(p.position)}</span>}
                                  {fmt(p.position)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
