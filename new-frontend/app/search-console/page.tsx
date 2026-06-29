'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { MousePointerClick, Eye, TrendingUp, Search, Loader2, Gauge } from 'lucide-react'

import { apiFetch } from '@/lib/api'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { DateRangeLabel } from '@/components/DateRangeLabel'
import { useLanguage } from '@/lib/language-context'
import { useChartColors, shortDate } from '@/lib/chart-theme'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

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
  const { t } = useLanguage()
  const chart = useChartColors()
  const [summary, setSummary] = useState<any>(null)
  const [queries, setQueries] = useState<any[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [positionTrend, setPositionTrend] = useState<any[]>([])
  const [pagespeed, setPagespeed] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { ps, pe } = getPrevRange(startDate, endDate)
        const [sumRes, sumPrevRes, qRes, pRes, trendRes, psRes] = await Promise.all([
          apiFetch(`/api/search-console/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/search-console/summary?start=${ps}&end=${pe}`),
          apiFetch(`/api/search-console/queries?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/search-console/pages?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/search-console/position-trend?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/search-console/pagespeed`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${sumRes.status}`)
        }
        const [s, sp, q, p, trend, pageSpeed] = await Promise.all([
          sumRes.json(),
          sumPrevRes.ok ? sumPrevRes.json() : null,
          qRes.ok ? qRes.json() : [],
          pRes.ok ? pRes.json() : [],
          trendRes.ok ? trendRes.json() : [],
          psRes.ok ? psRes.json() : null,
        ])
        setSummary({ cur: s, prev: sp })
        setQueries(q)
        setPages(p)
        setPositionTrend(trend)
        setPagespeed(pageSpeed)
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

      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header title={t('search.title')} description={t('search.desc')} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 page-in">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">{t('search.loading')}</span>
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
                    label={t('search.stat.clicks')}
                    tooltipKey="tooltip.clicks"
                    value={<AnimatedNumber value={cur.clicks} delay={0}   formatter={n => n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}K` : Math.round(n).toLocaleString('nl-NL')} />}
                    change={pctChg(cur.clicks, prev?.clicks) != null ? { value: Math.abs(pctChg(cur.clicks, prev?.clicks)!), isPositive: pctChg(cur.clicks, prev?.clicks)! >= 0 } : undefined}
                    icon={MousePointerClick} delay={0}
                  />
                  <StatCard
                    label={t('search.stat.impressions')}
                    tooltipKey="tooltip.impressions"
                    value={<AnimatedNumber value={cur.impressions} delay={100} formatter={n => n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}K` : Math.round(n).toLocaleString('nl-NL')} />}
                    change={pctChg(cur.impressions, prev?.impressions) != null ? { value: Math.abs(pctChg(cur.impressions, prev?.impressions)!), isPositive: pctChg(cur.impressions, prev?.impressions)! >= 0 } : undefined}
                    icon={Eye} delay={100}
                  />
                  <StatCard
                    label={t('search.stat.ctr')}
                    tooltipKey="tooltip.ctr"
                    value={<AnimatedNumber value={cur.ctr} delay={200} formatter={n => `${n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`} />}
                    change={pctChg(cur.ctr, prev?.ctr) != null ? { value: Math.abs(pctChg(cur.ctr, prev?.ctr)!), isPositive: pctChg(cur.ctr, prev?.ctr)! >= 0 } : undefined}
                    icon={TrendingUp} delay={200}
                  />
                  <StatCard
                    label={t('search.stat.position')}
                    tooltipKey="tooltip.position"
                    value={<AnimatedNumber value={cur.position} delay={300} formatter={n => n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} />}
                    change={pctChg(cur.position, prev?.position) != null ? { value: Math.abs(pctChg(cur.position, prev?.position)!), isPositive: pctChg(cur.position, prev?.position)! <= 0 } : undefined}
                    icon={Search} delay={300}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {positionTrend.length > 0 && (
                    <div className="stat-card">
                      <p className="text-foreground font-bold text-lg mb-1">{t('search.positionTrend')}</p>
                      <p className="text-muted-foreground text-sm mb-4">{t('search.positionTrendDesc')}</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={positionTrend.map(d => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis reversed tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBdr}`, borderRadius: 10, color: chart.tooltipText }}
                            formatter={(v: number) => [fmt(v), t('search.stat.position')]}
                          />
                          <Line type="monotone" dataKey="position" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {pagespeed?.configured && (
                    <div className="stat-card">
                      <p className="text-foreground font-bold text-lg mb-1">{t('search.pagespeed')}</p>
                      <p className="text-muted-foreground text-sm mb-4">{t('search.pagespeedDesc')}</p>
                      {pagespeed.score != null ? (
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3">
                            <Gauge className="w-8 h-8 text-accent" />
                            <div>
                              <p className="text-xs text-muted-foreground">{t('search.pagespeedScore')}</p>
                              <p className={`text-4xl font-black ${pagespeed.score >= 90 ? 'text-emerald-500' : pagespeed.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{pagespeed.score}</p>
                            </div>
                          </div>
                          {pagespeed.lcp_ms != null && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t('search.pagespeedLcp')}</p>
                              <p className="text-lg font-bold text-foreground">{(pagespeed.lcp_ms / 1000).toFixed(1)}s</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{pagespeed.error ?? t('search.pagespeedError')}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top queries */}
                  <div>
                    <div className="mb-4">
                      <p className="text-foreground font-bold text-lg">{t('search.topQueries')}</p>
                      <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /> · <span style={{ color: '#22C55E' }}>🥇 {t('search.top3')}</span> · <span style={{ color: '#EAB308' }}>✦ {t('search.top10')}</span> · {t('search.positionNote')}</p>
                    </div>

                    <div className="stat-card p-0 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.query')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.clicks')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.impressions')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.ctr')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.position')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queries.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-sm py-10" style={{ color: 'var(--text-subtle)' }}>{t('search.noQueries')}</td></tr>
                          ) : queries.map((q, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 transition-colors fade-in-up"
                              style={{ cursor: 'default', animationDelay: `${i * 50}ms` }}
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
                      <p className="text-foreground font-bold text-lg">{t('search.topPages')}</p>
                      <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /></p>
                    </div>

                    <div className="stat-card p-0 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.page')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.clicks')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.impressions')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('search.table.position')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-sm py-10" style={{ color: 'var(--text-subtle)' }}>{t('search.noPages')}</td></tr>
                          ) : pages.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 transition-colors fade-in-up"
                              style={{ cursor: 'default', animationDelay: `${i * 50}ms` }}
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
