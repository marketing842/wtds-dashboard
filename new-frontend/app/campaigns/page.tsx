'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { MousePointerClick, Eye, Euro, Target, Loader2, RefreshCw } from 'lucide-react'

import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

function fmtEur(n: number) {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getPrevRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevEnd = new Date(s)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  return { prev_start: prevStart.toISOString().slice(0, 10), prev_end: prevEnd.toISOString().slice(0, 10) }
}

function pctChg(a: number, b: number | null | undefined) {
  if (!b || b === 0) return null
  return ((a - b) / b) * 100
}

const MATCH_BADGE: Record<string, { label: string; color: string }> = {
  EXACT:  { label: 'Exact',  color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  BROAD:  { label: 'Broad',  color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  PHRASE: { label: 'Phrase', color: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30' },
}

export default function CampaignsPage() {
  const { startDate, endDate } = useDateRange()
  const [summary, setSummary] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [keywords, setKeywords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [kwLoading, setKwLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kwError, setKwError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { prev_start, prev_end } = getPrevRange(startDate, endDate)
        const [sumRes, sumPrevRes, campRes] = await Promise.all([
          apiFetch(`/api/google-ads/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/google-ads/summary?start=${prev_start}&end=${prev_end}`),
          apiFetch(`/api/google-ads/campaigns?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) throw new Error(`Google Ads: ${sumRes.status}`)
        const [s, sp, c] = await Promise.all([
          sumRes.json(),
          sumPrevRes.ok ? sumPrevRes.json() : null,
          campRes.ok ? campRes.json() : [],
        ])
        setSummary({ current: s, prev: sp })
        setCampaigns(c)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [startDate, endDate])

  const fetchKeywords = useCallback(async (start: string, end: string, attempt = 0) => {
    setKwLoading(true)
    setKwError(null)
    try {
      const res = await apiFetch(`/api/google-ads/keywords?start=${start}&end=${end}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setKeywords(data)
    } catch {
      if (attempt === 0) {
        // Auto-retry once after 3s — backend cache may not be warm yet
        setTimeout(() => fetchKeywords(start, end, 1), 3000)
      } else {
        setKwError('Could not load keywords')
      }
    } finally {
      setKwLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchKeywords(startDate, endDate), 600)
    return () => clearTimeout(timer)
  }, [startDate, endDate, fetchKeywords])

  const cur = summary?.current
  const prev = summary?.prev

  const active = campaigns.filter(c => c.status === 'ENABLED')
  const pausedCount = campaigns.filter(c => c.status === 'PAUSED').length

  const topKeywords = [...keywords]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title="Google Ads" description="Real campaign data for the selected period" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading Google Ads…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error} — Is the backend running on port 3000?
              </div>
            )}

            {!loading && !error && cur && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    label="Impressions"
                    value={cur.impressions >= 1000 ? `${fmt(cur.impressions / 1000)}K` : fmt(cur.impressions, 0)}
                    change={pctChg(cur.impressions, prev?.impressions) != null ? { value: Math.abs(pctChg(cur.impressions, prev?.impressions)!), isPositive: pctChg(cur.impressions, prev?.impressions)! >= 0 } : undefined}
                    icon={Eye}
                  />
                  <StatCard
                    label="Clicks"
                    value={fmt(cur.clicks, 0)}
                    change={pctChg(cur.clicks, prev?.clicks) != null ? { value: Math.abs(pctChg(cur.clicks, prev?.clicks)!), isPositive: pctChg(cur.clicks, prev?.clicks)! >= 0 } : undefined}
                    icon={MousePointerClick}
                  />
                  <StatCard
                    label="Cost"
                    value={fmtEur(cur.cost)}
                    change={pctChg(cur.cost, prev?.cost) != null ? { value: Math.abs(pctChg(cur.cost, prev?.cost)!), isPositive: pctChg(cur.cost, prev?.cost)! <= 0 } : undefined}
                    icon={Euro}
                  />
                  <StatCard
                    label="Conversions"
                    value={fmt(cur.conversions, 0)}
                    change={pctChg(cur.conversions, prev?.conversions) != null ? { value: Math.abs(pctChg(cur.conversions, prev?.conversions)!), isPositive: pctChg(cur.conversions, prev?.conversions)! >= 0 } : undefined}
                    icon={Target}
                  />
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  {[
                    { label: 'CTR', value: `${fmt(cur.ctr)}%` },
                    { label: 'Avg. CPC', value: fmtEur(cur.avg_cpc) },
                    { label: 'CPA', value: cur.conversions > 0 ? fmtEur(cur.cpa) : '—' },
                  ].map(m => (
                    <div key={m.label} className="stat-card flex items-center justify-between py-4">
                      <p className="text-muted-foreground text-sm font-medium">{m.label}</p>
                      <p className="text-2xl font-bold text-accent">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Top Keywords */}
                <div className="mb-8">
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-lg">Top Keywords</p>
                    <p className="text-muted-foreground text-sm mt-1">{startDate} → {endDate} · top 10 by clicks</p>
                  </div>

                  {kwLoading && (
                    <div className="flex items-center gap-3 py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      <span className="text-muted-foreground text-sm">Loading keywords…</span>
                    </div>
                  )}

                  {kwError && (
                    <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-lg px-4 py-3">
                      <span className="text-zinc-500 text-sm">Keywords unavailable for this period.</span>
                      <button
                        onClick={() => fetchKeywords(startDate, endDate)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#FF4D00] hover:text-orange-400 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  )}

                  {!kwLoading && !kwError && (
                    topKeywords.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No keyword data for this period.</p>
                    ) : (
                      <div className="stat-card p-0 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">Keyword</th>
                              <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Match</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Clicks</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">CTR</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Avg CPC</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Conv.</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topKeywords.map((kw, i) => {
                              const badge = MATCH_BADGE[kw.match_type] ?? { label: kw.match_type, color: 'bg-slate-500/20 text-muted-foreground border-slate-500/30' }
                              return (
                                <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors">
                                  <td className="px-5 py-3 text-foreground font-medium">{kw.text}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-foreground">{fmt(kw.clicks, 0)}</td>
                                  <td className="px-4 py-3 text-right text-accent">{fmt(kw.ctr)}%</td>
                                  <td className="px-4 py-3 text-right text-foreground">{fmtEur(kw.avg_cpc)}</td>
                                  <td className="px-4 py-3 text-right text-foreground">{fmt(kw.conversions, 0)}</td>
                                  <td className="px-5 py-3 text-right text-foreground">{fmtEur(kw.cost)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>

                {/* Active campaigns */}
                <div className="mb-6">
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-lg">Active Campaigns</p>
                    <p className="text-muted-foreground text-sm mt-1">{startDate} → {endDate} · {active.length} active{pausedCount > 0 ? `, ${pausedCount} paused` : ''}</p>
                  </div>

                  <div className="space-y-4">
                    {active.map(c => (
                      <div key={c.id} className="stat-card">
                        <div className="flex items-start justify-between mb-5">
                          <p className="text-foreground font-semibold text-base">{c.name}</p>
                          <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0 ml-4">
                            Active
                          </span>
                        </div>

                        <div className="grid grid-cols-6 gap-4">
                          {[
                            { label: 'Impressions', value: c.impressions >= 1000 ? `${fmt(c.impressions / 1000)}K` : String(c.impressions) },
                            { label: 'Clicks', value: String(c.clicks) },
                            { label: 'CTR', value: `${fmt(c.ctr)}%` },
                            { label: 'Cost', value: fmtEur(c.cost) },
                            { label: 'Conversions', value: String(c.conversions) },
                            { label: 'CPA', value: c.conversions > 0 ? fmtEur(c.cpa) : '—', accent: true },
                          ].map(m => (
                            <div key={m.label}>
                              <p className="text-muted-foreground text-xs mb-1">{m.label}</p>
                              <p className={`font-bold text-base ${m.accent ? 'text-accent' : 'text-foreground'}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {pausedCount > 0 && (
                  <p className="text-muted-foreground text-sm">
                    + {pausedCount} paused campaign{pausedCount !== 1 ? 's' : ''} not shown.
                  </p>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
