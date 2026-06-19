'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { Eye, MousePointerClick, Euro, TrendingUp, Loader2, ShoppingCart, Play, Film } from 'lucide-react'

import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

function fmtEur(n: number) {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

const RANK_COLOR = ['text-yellow-400', 'text-muted-foreground', 'text-orange-400']

export default function MetaPage() {
  const { startDate, endDate } = useDateRange()
  const [summary, setSummary] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [creatives, setCreatives] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { ps, pe } = getPrevRange(startDate, endDate)
        const [sumRes, sumPrevRes, campRes, creativeRes] = await Promise.all([
          apiFetch(`/api/meta/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/summary?start=${ps}&end=${pe}`),
          apiFetch(`/api/meta/campaigns?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/creatives?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          const code = body?.code ? ` (code ${body.code})` : ''
          throw new Error((body?.error ?? `HTTP ${sumRes.status}`) + code)
        }
        const [s, sp, c, cr] = await Promise.all([
          sumRes.json(),
          sumPrevRes.ok ? sumPrevRes.json() : null,
          campRes.ok ? campRes.json() : [],
          creativeRes.ok ? creativeRes.json() : [],
        ])
        setSummary({ cur: s, prev: sp })
        setCampaigns(c)
        setCreatives(cr)
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
  const active = campaigns.filter(c => c.status === 'ACTIVE')
  const inactive = campaigns.filter(c => c.status !== 'ACTIVE')

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title="Meta Ads" description="Facebook & Instagram campaign data for the selected period" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading Meta Ads…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error}
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
                    label="Ad Spend"
                    value={fmtEur(cur.spend)}
                    change={pctChg(cur.spend, prev?.spend) != null ? { value: Math.abs(pctChg(cur.spend, prev?.spend)!), isPositive: pctChg(cur.spend, prev?.spend)! <= 0 } : undefined}
                    icon={Euro}
                  />
                  <StatCard
                    label={cur.leads > 0 ? 'Leads' : 'Purchases'}
                    value={fmt(cur.leads > 0 ? cur.leads : cur.purchases, 0)}
                    change={(() => {
                      const v = cur.leads > 0 ? pctChg(cur.leads, prev?.leads) : pctChg(cur.purchases, prev?.purchases)
                      return v != null ? { value: Math.abs(v), isPositive: v >= 0 } : undefined
                    })()}
                    icon={ShoppingCart}
                  />
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'CTR', value: `${fmt(cur.ctr)}%` },
                    { label: 'Avg. CPC', value: fmtEur(cur.cpc) },
                    { label: 'ROAS', value: cur.roas > 0 ? `${fmt(cur.roas)}x` : '—' },
                    { label: 'Revenue', value: cur.purchase_value > 0 ? fmtEur(cur.purchase_value) : '—' },
                  ].map(m => (
                    <div key={m.label} className="stat-card flex items-center justify-between py-4">
                      <p className="text-muted-foreground text-sm font-medium">{m.label}</p>
                      <p className="text-2xl font-bold text-accent">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Top Ads / Creatives */}
                {creatives.length > 0 && (
                  <div className="mb-8">
                    <p className="text-foreground font-bold text-lg mb-4">Top Ads — Creative Performance</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {creatives.map((ad, i) => (
                        <div key={ad.id} className="stat-card border-t-2 border-t-accent/40 relative">
                          {/* Rank badge */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-2xl font-black ${RANK_COLOR[i]}`}>#{i + 1}</span>
                            <div className="flex items-center gap-2">
                              {ad.is_video && (
                                <span className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                  <Film className="w-3 h-3" /> Video
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                ad.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-500/20 text-muted-foreground border-slate-500/30'
                              }`}>{ad.status === 'ACTIVE' ? 'Active' : ad.status}</span>
                            </div>
                          </div>

                          {/* Ad name */}
                          <p className="text-foreground text-sm font-semibold mb-4 leading-snug line-clamp-2">{ad.name}</p>

                          {/* Metrics grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">Spend</p>
                              <p className="text-foreground text-sm font-bold">{fmtEur(ad.spend)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">CTR</p>
                              <p className="text-accent text-sm font-bold">{fmt(ad.ctr)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">Impressions</p>
                              <p className="text-foreground text-sm font-bold">
                                {ad.impressions >= 1000 ? `${fmt(ad.impressions / 1000)}K` : ad.impressions}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">{ad.leads > 0 ? 'Leads' : 'Purchases'}</p>
                              <p className="text-foreground text-sm font-bold">{ad.leads > 0 ? ad.leads : ad.purchases}</p>
                            </div>
                            {ad.thumbstop_rate != null && (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">Thumbstop</p>
                                <p className="text-purple-700 dark:text-purple-300 text-sm font-bold">{fmt(ad.thumbstop_rate)}%</p>
                              </div>
                            )}
                            {ad.hold_rate != null && (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">Hold Rate (30s)</p>
                                <p className="text-blue-700 dark:text-blue-300 text-sm font-bold">{fmt(ad.hold_rate)}%</p>
                              </div>
                            )}
                            {ad.avg_watch_sec != null && (
                              <div className="col-span-2">
                                <p className="text-muted-foreground text-xs mb-0.5">Avg. Watch Time</p>
                                <p className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">{fmt(ad.avg_watch_sec)}s</p>
                              </div>
                            )}
                            {ad.roas > 0 && (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">ROAS</p>
                                <p className="text-accent text-sm font-bold">{fmt(ad.roas)}x</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active campaigns */}
                <div className="mb-6">
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-lg">Campaigns</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {startDate} → {endDate} · {active.length} active{inactive.length > 0 ? `, ${inactive.length} inactive` : ''}
                    </p>
                  </div>

                  {campaigns.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No campaign data for this period.</p>
                  ) : (
                    <div className="space-y-4">
                      {campaigns.map(c => (
                        <div key={c.id} className="stat-card">
                          <div className="flex items-start justify-between mb-5">
                            <p className="text-foreground font-semibold text-base">{c.name}</p>
                            <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border flex-shrink-0 ml-4 ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-500/20 text-muted-foreground border-slate-500/30'
                            }`}>
                              {c.status === 'ACTIVE' ? 'Active' : c.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-6 gap-4">
                            {[
                              { label: 'Impressions', value: c.impressions >= 1000 ? `${fmt(c.impressions / 1000)}K` : String(c.impressions) },
                              { label: 'Clicks', value: fmt(c.clicks, 0) },
                              { label: 'CTR', value: `${fmt(c.ctr)}%` },
                              { label: 'Spend', value: fmtEur(c.spend) },
                              { label: c.leads > 0 ? 'Leads' : 'Purchases', value: String(c.leads > 0 ? c.leads : c.purchases) },
                              { label: 'ROAS', value: c.roas > 0 ? `${fmt(c.roas)}x` : '—', accent: true },
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
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
