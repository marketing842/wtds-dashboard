'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { useDateRange } from '@/lib/date-range-context'
import { Euro, Target, Eye, Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'

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

interface ChannelErrors {
  gAds?: string
  meta?: string
  klaviyo?: string
  gsc?: string
}

export default function OverviewPage() {
  const { startDate, endDate } = useDateRange()
  const { resolvedTheme } = useTheme()
  const { t: tr } = useLanguage()
  const isDark = resolvedTheme !== 'light'

  // Chart color tokens — theme-aware
  const chartGrid    = isDark ? '#2E3350' : '#E5E7EB'
  const chartTick    = isDark ? '#8B92A9' : '#9CA3AF'
  const tooltipBg    = isDark ? '#21253A' : '#FFFFFF'
  const tooltipBdr   = isDark ? '#2E3350' : '#E2E6F0'
  const tooltipText  = isDark ? '#F0F2FF' : '#111827'
  const [gAds, setGAds] = useState<any>(null)
  const [gAdsPrev, setGAdsPrev] = useState<any>(null)
  const [meta, setMeta] = useState<any>(null)
  const [metaPrev, setMetaPrev] = useState<any>(null)
  const [klaviyo, setKlaviyo] = useState<any>(null)
  const [gsc, setGsc] = useState<any>(null)
  // Per-channel loading flags instead of one global spinner
  const [loadingChannels, setLoadingChannels] = useState({ gAds: true, meta: true, klaviyo: true, gsc: true })
  const [errors, setErrors] = useState<ChannelErrors>({})

  useEffect(() => {
    const t = setTimeout(() => {
      // Reset state & show loading per channel immediately
      setGAds(null); setGAdsPrev(null); setMeta(null); setMetaPrev(null)
      setKlaviyo(null); setGsc(null)
      setErrors({})
      setLoadingChannels({ gAds: true, meta: true, klaviyo: true, gsc: true })

      const { ps, pe } = getPrevRange(startDate, endDate)

      async function safeFetch(url: string): Promise<any> {
        const r = await apiFetch(url)
        if (r.ok) return r.json()
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error ?? body.detail ?? `HTTP ${r.status}`)
      }

      // Fire all fetches independently — each updates as it completes
      safeFetch(`/api/google-ads/summary?start=${startDate}&end=${endDate}`)
        .then(d => setGAds(d))
        .catch(e => setErrors(prev => ({ ...prev, gAds: e.message })))
        .finally(() => setLoadingChannels(prev => ({ ...prev, gAds: false })))

      safeFetch(`/api/google-ads/summary?start=${ps}&end=${pe}`)
        .then(d => setGAdsPrev(d)).catch(() => {})

      safeFetch(`/api/meta/summary?start=${startDate}&end=${endDate}`)
        .then(d => setMeta(d))
        .catch(e => setErrors(prev => ({ ...prev, meta: e.message })))
        .finally(() => setLoadingChannels(prev => ({ ...prev, meta: false })))

      safeFetch(`/api/meta/summary?start=${ps}&end=${pe}`)
        .then(d => setMetaPrev(d)).catch(() => {})

      safeFetch(`/api/klaviyo/summary?start=${startDate}&end=${endDate}&compare_start=${ps}&compare_end=${pe}`)
        .then(d => setKlaviyo(d))
        .catch(e => setErrors(prev => ({ ...prev, klaviyo: e.message })))
        .finally(() => setLoadingChannels(prev => ({ ...prev, klaviyo: false })))

      safeFetch(`/api/search-console/summary?start=${startDate}&end=${endDate}`)
        .then(d => setGsc(d))
        .catch(e => setErrors(prev => ({ ...prev, gsc: e.message })))
        .finally(() => setLoadingChannels(prev => ({ ...prev, gsc: false })))
    }, 600)
    return () => clearTimeout(t)
  }, [startDate, endDate])

  const totalSpend = (gAds?.cost ?? 0) + (meta?.spend ?? 0)
  const prevTotalSpend = (gAdsPrev?.cost ?? 0) + (metaPrev?.spend ?? 0)
  const metaLeads = (m: any) => (m?.leads ?? 0) || (m?.purchases ?? 0)
  const totalLeads = (gAds?.conversions ?? 0) + metaLeads(meta)
  const prevTotalLeads = (gAdsPrev?.conversions ?? 0) + metaLeads(metaPrev)
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : null
  const prevAvgCpl = prevTotalLeads > 0 ? prevTotalSpend / prevTotalLeads : null
  const totalImpressions = (gAds?.impressions ?? 0) + (meta?.impressions ?? 0)
  const prevTotalImpressions = (gAdsPrev?.impressions ?? 0) + (metaPrev?.impressions ?? 0)

  const spendChartData = [
    { channel: 'Google Ads', spend: gAds?.cost ?? 0 },
    { channel: 'Meta Ads', spend: meta?.spend ?? 0 },
  ]

  const leadsChartData = [
    { channel: 'Google Ads', leads: gAds?.conversions ?? 0 },
    { channel: 'Meta Ads', leads: metaLeads(meta) },
  ]

  const totalSpendForPie = (gAds?.cost ?? 0) + (meta?.spend ?? 0)
  const spendPieData = [
    { name: 'Google Ads', value: gAds?.cost ?? 0, color: '#FF4D00' },
    { name: 'Meta Ads', value: meta?.spend ?? 0, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  const insights: Array<{ type: 'good' | 'warn'; title: string; detail: string }> = []

  if (gAds) {
    if (gAds.ctr > 3) {
      insights.push({
        type: 'good',
        title: `Google Ads CTR ${fmt(gAds.ctr)}% — above benchmark`,
        detail: 'Your click-through rate exceeds the typical 2–3% search benchmark.',
      })
    }
    if (gAds.cpa > 0 && gAds.cpa < 50) {
      insights.push({
        type: 'good',
        title: `Strong CPA at ${fmtEur(gAds.cpa)}`,
        detail: 'Cost per acquisition is well within an efficient range.',
      })
    }
    if (gAds.cpa > 100) {
      insights.push({
        type: 'warn',
        title: `Google Ads CPA ${fmtEur(gAds.cpa)} — consider optimizing bids`,
        detail: 'CPA is above €100. Review bid strategies or negative keywords.',
      })
    }
  }

  if (klaviyo?.current?.open_rate > 30) {
    insights.push({
      type: 'good',
      title: `Email open rate ${fmt(klaviyo.current.open_rate)}% — excellent engagement`,
      detail: 'Open rate above 30% signals a highly engaged subscriber list.',
    })
  }

  if (meta?.ctr > 2) {
    insights.push({
      type: 'good',
      title: `Meta CTR ${fmt(meta.ctr)}% — performing well`,
      detail: 'Meta ad click-through rate is above the 1–2% industry average.',
    })
  }

  if (gsc?.position > 0 && gsc.position < 5) {
    insights.push({
      type: 'good',
      title: `Ranking avg position ${fmt(gsc.position)} in Google Search`,
      detail: 'Strong organic visibility — top 5 average position across tracked queries.',
    })
  }

  const isAnyLoading = Object.values(loadingChannels).some(Boolean)
  const hasAnyData = gAds || meta || klaviyo || gsc
  const errorEntries = Object.entries(errors)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title={tr('dashboard.title')} description={tr('dashboard.desc')} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 page-in">

            {(
              <>
                {/* Loading bar at top — subtle, doesn't block content */}
                {isAnyLoading && (
                  <div className="h-0.5 w-full rounded mb-6 overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full bg-accent animate-pulse rounded" style={{ width: '60%', boxShadow: '0 0 8px rgba(255,77,0,0.5)' }} />
                  </div>
                )}

                {errorEntries.length > 0 && (
                  <div className="rounded-xl p-4 mb-6 flex gap-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
                    <div>
                      <p className="text-red-700 dark:text-red-300 text-sm font-semibold mb-1">{tr('dashboard.errorChannels')}</p>
                      <ul className="text-red-700 dark:text-red-400 text-xs space-y-0.5">
                        {errorEntries.map(([ch, msg]) => (
                          <li key={ch} className="capitalize">{ch}: {msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {(hasAnyData || isAnyLoading) && (
                  <>
                    {/* Cross-channel KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <StatCard
                        label={tr('dashboard.stat.totalSpend')}
                        value={<AnimatedNumber value={totalSpend} delay={0}   formatter={n => `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />}
                        change={pctChg(totalSpend, prevTotalSpend) != null ? { value: Math.abs(pctChg(totalSpend, prevTotalSpend)!), isPositive: pctChg(totalSpend, prevTotalSpend)! <= 0 } : undefined}
                        icon={Euro} delay={0}
                      />
                      <StatCard
                        label={tr('dashboard.stat.totalLeads')}
                        value={<AnimatedNumber value={totalLeads} delay={100} formatter={n => Math.round(n).toLocaleString('nl-NL')} />}
                        change={pctChg(totalLeads, prevTotalLeads) != null ? { value: Math.abs(pctChg(totalLeads, prevTotalLeads)!), isPositive: pctChg(totalLeads, prevTotalLeads)! >= 0 } : undefined}
                        icon={Target} delay={100}
                      />
                      <StatCard
                        label={tr('dashboard.stat.avgCpl')}
                        value={avgCpl !== null ? <AnimatedNumber value={avgCpl} delay={200} formatter={n => `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /> : '—'}
                        change={avgCpl !== null && prevAvgCpl !== null && pctChg(avgCpl, prevAvgCpl) != null ? { value: Math.abs(pctChg(avgCpl, prevAvgCpl)!), isPositive: pctChg(avgCpl, prevAvgCpl)! <= 0 } : undefined}
                        icon={Target} delay={200}
                      />
                      <StatCard
                        label={tr('dashboard.stat.totalImpressions')}
                        value={<AnimatedNumber value={totalImpressions} delay={300} formatter={n => n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}K` : Math.round(n).toLocaleString('nl-NL')} />}
                        change={pctChg(totalImpressions, prevTotalImpressions) != null ? { value: Math.abs(pctChg(totalImpressions, prevTotalImpressions)!), isPositive: pctChg(totalImpressions, prevTotalImpressions)! >= 0 } : undefined}
                        icon={Eye} delay={300}
                      />
                    </div>

                    {/* Channel summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      {/* Google Ads */}
                      <div className="stat-card channel-google fade-in-up-1">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FF4D00' }}>Google Ads</p>
                          {loadingChannels.gAds
                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-subtle)' }} />
                            : <span className="w-2 h-2 rounded-full" style={{ background: gAds ? '#22C55E' : 'var(--text-subtle)', boxShadow: gAds ? '0 0 6px rgba(34,197,94,0.6)' : 'none' }} />
                          }
                        </div>
                        {gAds ? (
                          <div className="space-y-2.5">
                            {([[tr('dashboard.channelLabel.spend'), fmtEur(gAds.cost)], [tr('dashboard.channelLabel.clicks'), fmt(gAds.clicks, 0)], [tr('dashboard.channelLabel.conversions'), fmt(gAds.conversions, 0)], [tr('dashboard.channelLabel.ctr'), `${fmt(gAds.ctr)}%`]] as [string, string][]).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        ) : loadingChannels.gAds ? (
                          <div className="space-y-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-3 skeleton-shimmer" />)}</div>
                        ) : (
                          <p className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>{tr('dashboard.noData')}</p>
                        )}
                      </div>

                      {/* Meta Ads */}
                      <div className="stat-card channel-meta fade-in-up-2">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4F7EFF' }}>Meta Ads</p>
                          {loadingChannels.meta
                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-subtle)' }} />
                            : <span className="w-2 h-2 rounded-full" style={{ background: meta ? '#22C55E' : 'var(--text-subtle)', boxShadow: meta ? '0 0 6px rgba(34,197,94,0.6)' : 'none' }} />
                          }
                        </div>
                        {meta ? (
                          <div className="space-y-2.5">
                            {([[tr('dashboard.channelLabel.spend'), fmtEur(meta.spend)], [tr('dashboard.channelLabel.clicks'), fmt(meta.clicks, 0)], [meta.leads > 0 ? tr('dashboard.channelLabel.leads') : tr('dashboard.channelLabel.purchases'), fmt(meta.leads > 0 ? meta.leads : meta.purchases, 0)], [tr('dashboard.channelLabel.ctr'), `${fmt(meta.ctr)}%`]] as [string, string][]).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        ) : loadingChannels.meta ? (
                          <div className="space-y-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-3 skeleton-shimmer" />)}</div>
                        ) : (
                          <p className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>{tr('dashboard.noData')}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="stat-card channel-email fade-in-up-3">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10B981' }}>Email</p>
                          {loadingChannels.klaviyo
                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-subtle)' }} />
                            : <span className="w-2 h-2 rounded-full" style={{ background: klaviyo?.current ? '#22C55E' : 'var(--text-subtle)', boxShadow: klaviyo?.current ? '0 0 6px rgba(34,197,94,0.6)' : 'none' }} />
                          }
                        </div>
                        {klaviyo?.current ? (
                          <div className="space-y-2.5">
                            {([[tr('dashboard.channelLabel.delivered'), fmt(klaviyo.current.delivered, 0)], [tr('dashboard.channelLabel.openRate'), `${fmt(klaviyo.current.open_rate)}%`], ['CTOR', `${fmt(klaviyo.current.ctor)}%`]] as [string, string][]).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        ) : loadingChannels.klaviyo ? (
                          <div className="space-y-2.5">{[...Array(3)].map((_, i) => <div key={i} className="h-3 skeleton-shimmer" />)}</div>
                        ) : (
                          <p className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>{tr('dashboard.noData')}</p>
                        )}
                      </div>

                      {/* Search Console */}
                      <div className="stat-card channel-search fade-in-up-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>Search Console</p>
                          {loadingChannels.gsc
                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-subtle)' }} />
                            : <span className="w-2 h-2 rounded-full" style={{ background: gsc ? '#22C55E' : 'var(--text-subtle)', boxShadow: gsc ? '0 0 6px rgba(34,197,94,0.6)' : 'none' }} />
                          }
                        </div>
                        {gsc ? (
                          <div className="space-y-2.5">
                            {([[tr('dashboard.channelLabel.clicks'), fmt(gsc.clicks, 0)], [tr('dashboard.channelLabel.avgPosition'), fmt(gsc.position)], [tr('dashboard.channelLabel.ctr'), `${fmt(gsc.ctr)}%`]] as [string, string][]).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        ) : loadingChannels.gsc ? (
                          <div className="space-y-2.5">{[...Array(3)].map((_, i) => <div key={i} className="h-3 skeleton-shimmer" />)}</div>
                        ) : (
                          <p className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>{tr('dashboard.noData')}</p>
                        )}
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Spend by Channel */}
                      <div className="stat-card">
                        <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Spend by Channel</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={spendChartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="channel" tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${fmt(v, 0)}`} />
                            <Tooltip
                              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                              labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                              itemStyle={{ color: tooltipText, fontSize: 12 }}
                              formatter={(v: number) => [fmtEur(v), 'Spend']}
                              cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                            />
                            <Bar dataKey="spend" fill="#FF4D00" radius={[6, 6, 0, 0]} animationDuration={1200} animationBegin={100} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Leads / Conversions by Channel */}
                      <div className="stat-card">
                        <p className="text-sm font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Leads by Channel</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={leadsChartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="channel" tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                              labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                              itemStyle={{ color: tooltipText, fontSize: 12 }}
                              formatter={(v: number) => [fmt(v, 0), 'Leads']}
                              cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                            />
                            <Bar dataKey="leads" fill="#10B981" radius={[6, 6, 0, 0]} animationDuration={1200} animationBegin={100} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Kanaalverdeling — Spend Distribution donut */}
                    {spendPieData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <div className="stat-card">
                        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Kanaalverdeling — Spend %</p>
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                              <Pie
                                data={spendPieData}
                                cx="50%" cy="50%"
                                innerRadius={55} outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {spendPieData.map((entry, index) => (
                                  <Cell key={index} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: tooltipText, fontSize: 12 }}
                                formatter={(v: number) => [fmtEur(v), 'Spend']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-4 flex-1">
                            {spendPieData.map(d => (
                              <div key={d.name}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                                  </div>
                                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {totalSpendForPie > 0 ? fmt((d.value / totalSpendForPie) * 100) : 0}%
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${totalSpendForPie > 0 ? (d.value / totalSpendForPie) * 100 : 0}%`, background: d.color }}
                                  />
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>{fmtEur(d.value)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* CTR comparison */}
                      <div className="stat-card">
                        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>CTR by Channel</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={[
                              { channel: 'Google Ads', ctr: gAds?.ctr ?? 0 },
                              { channel: 'Meta Ads',   ctr: meta?.ctr ?? 0 },
                              { channel: 'Search',     ctr: gsc?.ctr ?? 0 },
                            ]}
                            margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                            <XAxis dataKey="channel" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v)}%`} />
                            <Tooltip
                              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                              labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                              itemStyle={{ color: tooltipText, fontSize: 12 }}
                              formatter={(v: number) => [`${fmt(v)}%`, 'CTR']}
                              cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                            />
                            <Bar dataKey="ctr" fill="#8B5CF6" radius={[6, 6, 0, 0]} animationDuration={1200} animationBegin={100} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    )}

                    {/* Insights */}
                    {insights.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-foreground font-bold text-base">Performance Insights</p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {insights.map((ins, i) =>
                            ins.type === 'good' ? (
                              <div key={i} className="rounded-xl p-4 flex items-start gap-3 fade-in-up" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(34,197,94,0.15)' }}>
                                  <span className="text-sm">✓</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-sm mb-1" style={{ color: '#22C55E' }}>{ins.title}</p>
                                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ins.detail}</p>
                                </div>
                              </div>
                            ) : (
                              <div key={i} className="rounded-xl p-4 flex items-start gap-3 fade-in-up" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.18)' }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(234,179,8,0.15)' }}>
                                  <span className="text-sm">⚠</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-sm mb-1" style={{ color: '#EAB308' }}>{ins.title}</p>
                                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ins.detail}</p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
