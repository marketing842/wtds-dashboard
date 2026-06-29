'use client'

import { useState, useEffect, type ReactNode } from 'react'
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
  LineChart,
  Line,
  Legend,
} from 'recharts'

import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'
import { useChartColors } from '@/lib/chart-theme'

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

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{ height, background: 'var(--border)', opacity: 0.4 }}
    >
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function ValueSkeleton({ wide = false }: { wide?: boolean }) {
  return <div className={`h-7 skeleton-shimmer rounded ${wide ? 'w-36' : 'w-24'}`} />
}

function ChartFrame({
  loading,
  height,
  chartKey,
  children,
}: {
  loading: boolean
  height: number
  chartKey: string
  children: ReactNode
}) {
  if (loading) return <ChartSkeleton height={height} />
  return (
    <div key={chartKey} style={{ width: '100%', height }}>
      {children}
    </div>
  )
}

interface ChannelErrors {
  gAds?: string
  meta?: string
  klaviyo?: string
  gsc?: string
}

const CHANNEL_LABEL_KEYS: Record<string, string> = {
  gAds: 'dashboard.channel.gAds',
  meta: 'dashboard.channel.meta',
  klaviyo: 'dashboard.channel.email',
  gsc: 'dashboard.channel.gsc',
}

export default function OverviewPage() {
  const { startDate, endDate } = useDateRange()
  const { resolvedTheme } = useTheme()
  const { t: tr, fmt, fmtEur, fmtK, shortDate, monthLabel } = useLanguage()
  const chart = useChartColors()
  const isDark = resolvedTheme !== 'light'

  // Chart color tokens — theme-aware (legacy refs kept for existing charts)
  const chartGrid    = chart.grid
  const chartTick    = chart.tick
  const tooltipBg    = chart.tooltipBg
  const tooltipBdr   = chart.tooltipBdr
  const tooltipText  = chart.tooltipText
  const [gAds, setGAds] = useState<any>(null)
  const [gAdsPrev, setGAdsPrev] = useState<any>(null)
  const [meta, setMeta] = useState<any>(null)
  const [metaPrev, setMetaPrev] = useState<any>(null)
  const [klaviyo, setKlaviyo] = useState<any>(null)
  const [gsc, setGsc] = useState<any>(null)
  const [gAdsDaily, setGAdsDaily] = useState<any[]>([])
  const [metaDaily, setMetaDaily] = useState<any[]>([])
  const [overviewExt, setOverviewExt] = useState<any>(null)
  // Per-channel loading flags instead of one global spinner
  const [loadingChannels, setLoadingChannels] = useState({ gAds: true, meta: true, klaviyo: true, gsc: true })
  const [loadingExtended, setLoadingExtended] = useState(true)
  const [loadingDaily, setLoadingDaily] = useState(true)
  const [errors, setErrors] = useState<ChannelErrors>({})

  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      if (!active) return
      // Reset state & show loading per channel immediately
      setGAds(null); setGAdsPrev(null); setMeta(null); setMetaPrev(null)
      setKlaviyo(null); setGsc(null)
      setGAdsDaily([]); setMetaDaily([]); setOverviewExt(null)
      setErrors({})
      setLoadingChannels({ gAds: true, meta: true, klaviyo: true, gsc: true })
      setLoadingExtended(true)
      setLoadingDaily(true)

      const { ps, pe } = getPrevRange(startDate, endDate)

      async function safeFetch(url: string): Promise<any> {
        const r = await apiFetch(url)
        if (r.ok) return r.json()
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error ?? body.detail ?? `HTTP ${r.status}`)
      }

      // Fire all fetches independently — each updates as it completes
      safeFetch(`/api/google-ads/summary?start=${startDate}&end=${endDate}`)
        .then(d => { if (active) setGAds(d) })
        .catch(e => { if (active) setErrors(prev => ({ ...prev, gAds: e.message })) })
        .finally(() => { if (active) setLoadingChannels(prev => ({ ...prev, gAds: false })) })

      safeFetch(`/api/google-ads/summary?start=${ps}&end=${pe}`)
        .then(d => { if (active) setGAdsPrev(d) }).catch(() => {})

      safeFetch(`/api/meta/summary?start=${startDate}&end=${endDate}`)
        .then(d => { if (active) setMeta(d) })
        .catch(e => { if (active) setErrors(prev => ({ ...prev, meta: e.message })) })
        .finally(() => { if (active) setLoadingChannels(prev => ({ ...prev, meta: false })) })

      safeFetch(`/api/meta/summary?start=${ps}&end=${pe}`)
        .then(d => { if (active) setMetaPrev(d) }).catch(() => {})

      safeFetch(`/api/klaviyo/summary?start=${startDate}&end=${endDate}&compare_start=${ps}&compare_end=${pe}`)
        .then(d => { if (active) setKlaviyo(d) })
        .catch(e => { if (active) setErrors(prev => ({ ...prev, klaviyo: e.message })) })
        .finally(() => { if (active) setLoadingChannels(prev => ({ ...prev, klaviyo: false })) })

      safeFetch(`/api/search-console/summary?start=${startDate}&end=${endDate}`)
        .then(d => { if (active) setGsc(d) })
        .catch(e => { if (active) setErrors(prev => ({ ...prev, gsc: e.message })) })
        .finally(() => { if (active) setLoadingChannels(prev => ({ ...prev, gsc: false })) })

      Promise.allSettled([
        safeFetch(`/api/google-ads/daily?start=${startDate}&end=${endDate}`),
        safeFetch(`/api/meta/daily?start=${startDate}&end=${endDate}`),
      ]).then(([gRes, mRes]) => {
        if (!active) return
        if (gRes.status === 'fulfilled') setGAdsDaily(gRes.value)
        if (mRes.status === 'fulfilled') setMetaDaily(mRes.value)
      }).finally(() => { if (active) setLoadingDaily(false) })

      safeFetch(`/api/overview/extended?start=${startDate}&end=${endDate}&compare_start=${ps}&compare_end=${pe}`)
        .then(d => { if (active) setOverviewExt(d) })
        .catch(() => {})
        .finally(() => { if (active) setLoadingExtended(false) })
    }, 600)
    return () => { active = false; clearTimeout(t) }
  }, [startDate, endDate])

  const chartKey = `${startDate}_${endDate}`

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
    { channel: tr('dashboard.channel.gAds'), spend: gAds?.cost ?? 0 },
    { channel: tr('dashboard.channel.meta'), spend: meta?.spend ?? 0 },
  ]

  const leadsChartData = [
    { channel: tr('dashboard.channel.gAds'), leads: gAds?.conversions ?? 0 },
    { channel: tr('dashboard.channel.meta'), leads: metaLeads(meta) },
  ]

  const totalSpendForPie = (gAds?.cost ?? 0) + (meta?.spend ?? 0)
  const spendPieData = [
    { name: tr('dashboard.channel.gAds'), value: gAds?.cost ?? 0, color: '#FF4D00' },
    { name: tr('dashboard.channel.meta'), value: meta?.spend ?? 0, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  const ctrChartData = [
    { channel: tr('dashboard.channel.gAds'), ctr: gAds?.ctr ?? 0 },
    { channel: tr('dashboard.channel.meta'), ctr: meta?.ctr ?? 0 },
    { channel: tr('dashboard.channel.gsc'), ctr: gsc?.ctr ?? 0 },
  ]

  const dailyLeadsMap = new Map<string, { date: string; label: string; gAds: number; meta: number; total: number }>()
  for (const d of gAdsDaily) {
    const cur = dailyLeadsMap.get(d.date) ?? { date: d.date, label: shortDate(d.date), gAds: 0, meta: 0, total: 0 }
    cur.gAds += d.conversions ?? 0
    dailyLeadsMap.set(d.date, cur)
  }
  for (const d of metaDaily) {
    const cur = dailyLeadsMap.get(d.date) ?? { date: d.date, label: shortDate(d.date), gAds: 0, meta: 0, total: 0 }
    cur.meta += d.leads ?? 0
    dailyLeadsMap.set(d.date, cur)
  }
  const dailyLeadsChart = [...dailyLeadsMap.values()]
    .map(d => ({ ...d, total: d.gAds + d.meta }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const momLeads = pctChg(totalLeads, prevTotalLeads)

  const monthlyLeadsChart = (overviewExt?.monthly ?? []).map((m: any) => {
    const [y, mo] = (m.month ?? '').split('-').map(Number)
    const label = y && mo
      ? monthLabel(new Date(y, mo - 1, 1), true)
      : m.label
    return { ...m, label }
  })

  const momChartData = (overviewExt?.mom ?? [])
    .filter((c: any) => c.growth_pct != null)
    .map((c: any) => ({
      channel: tr(CHANNEL_LABEL_KEYS[c.id] ?? c.id),
      growth: Math.round(c.growth_pct * 10) / 10,
      fill: c.growth_pct >= 0 ? '#10B981' : '#EF4444',
    }))

  const pipeline = overviewExt?.pipeline

  const insights: Array<{ type: 'good' | 'warn'; title: string; detail: string }> = []

  if (gAds) {
    if (gAds.ctr > 3) {
      insights.push({
        type: 'good',
        title: tr('dashboard.insight.gAdsCtrGood').replace('{ctr}', fmt(gAds.ctr)),
        detail: tr('dashboard.insight.gAdsCtrGoodDetail'),
      })
    }
    if (gAds.cpa > 0 && gAds.cpa < 50) {
      insights.push({
        type: 'good',
        title: tr('dashboard.insight.gAdsCpaGood').replace('{cpa}', fmtEur(gAds.cpa)),
        detail: tr('dashboard.insight.gAdsCpaGoodDetail'),
      })
    }
    if (gAds.cpa > 100) {
      insights.push({
        type: 'warn',
        title: tr('dashboard.insight.gAdsCpaWarn').replace('{cpa}', fmtEur(gAds.cpa)),
        detail: tr('dashboard.insight.gAdsCpaWarnDetail'),
      })
    }
  }

  if (klaviyo?.current?.open_rate > 30) {
    insights.push({
      type: 'good',
      title: tr('dashboard.insight.emailOpenGood').replace('{rate}', fmt(klaviyo.current.open_rate)),
      detail: tr('dashboard.insight.emailOpenGoodDetail'),
    })
  }

  if (meta?.ctr > 2) {
    insights.push({
      type: 'good',
      title: tr('dashboard.insight.metaCtrGood').replace('{ctr}', fmt(meta.ctr)),
      detail: tr('dashboard.insight.metaCtrGoodDetail'),
    })
  }

  if (gsc?.position > 0 && gsc.position < 5) {
    insights.push({
      type: 'good',
      title: tr('dashboard.insight.seoPositionGood').replace('{pos}', fmt(gsc.position)),
      detail: tr('dashboard.insight.seoPositionGoodDetail'),
    })
  }

  const isAnyLoading = Object.values(loadingChannels).some(Boolean)
  const loadingPipeline = loadingExtended || loadingChannels.gAds || loadingChannels.meta
  const loadingOverviewCharts = loadingExtended
  const loadingBottomCharts = loadingChannels.gAds || loadingChannels.meta || loadingChannels.gsc
  const hasAnyData = gAds || meta || klaviyo || gsc
  const errorEntries = Object.entries(errors)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header title={tr('dashboard.title')} description={tr('dashboard.desc')} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 page-in">

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
                          <li key={ch}><span className="font-semibold">{tr(CHANNEL_LABEL_KEYS[ch] ?? ch)}:</span> {msg}</li>
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
                        tooltipKey="tooltip.spend"
                        value={
                          loadingChannels.gAds || loadingChannels.meta
                            ? <ValueSkeleton wide />
                            : <AnimatedNumber value={totalSpend} delay={0} formatter={n => fmtEur(n)} />
                        }
                        change={pctChg(totalSpend, prevTotalSpend) != null ? { value: Math.abs(pctChg(totalSpend, prevTotalSpend)!), isPositive: pctChg(totalSpend, prevTotalSpend)! <= 0 } : undefined}
                        icon={Euro} delay={0}
                      />
                      <StatCard
                        label={tr('dashboard.stat.totalLeads')}
                        tooltipKey="tooltip.leads"
                        value={
                          loadingChannels.gAds || loadingChannels.meta
                            ? <ValueSkeleton />
                            : <AnimatedNumber value={totalLeads} delay={100} />
                        }
                        change={pctChg(totalLeads, prevTotalLeads) != null ? { value: Math.abs(pctChg(totalLeads, prevTotalLeads)!), isPositive: pctChg(totalLeads, prevTotalLeads)! >= 0 } : undefined}
                        icon={Target} delay={100}
                      />
                      <StatCard
                        label={tr('dashboard.stat.avgCpl')}
                        tooltipKey="tooltip.kpl"
                        value={
                          loadingChannels.gAds || loadingChannels.meta
                            ? <ValueSkeleton />
                            : avgCpl !== null
                              ? <AnimatedNumber value={avgCpl} delay={200} formatter={n => fmtEur(n)} />
                              : '—'
                        }
                        change={avgCpl !== null && prevAvgCpl !== null && pctChg(avgCpl, prevAvgCpl) != null ? { value: Math.abs(pctChg(avgCpl, prevAvgCpl)!), isPositive: pctChg(avgCpl, prevAvgCpl)! <= 0 } : undefined}
                        icon={Target} delay={200}
                      />
                      <StatCard
                        label={tr('dashboard.stat.totalImpressions')}
                        tooltipKey="tooltip.impressions"
                        value={
                          loadingChannels.gAds || loadingChannels.meta
                            ? <ValueSkeleton />
                            : <AnimatedNumber value={totalImpressions} delay={300} formatter={n => fmtK(n)} />
                        }
                        change={pctChg(totalImpressions, prevTotalImpressions) != null ? { value: Math.abs(pctChg(totalImpressions, prevTotalImpressions)!), isPositive: pctChg(totalImpressions, prevTotalImpressions)! >= 0 } : undefined}
                        icon={Eye} delay={300}
                      />
                    </div>

                    {/* Channel summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      {/* Google Ads */}
                      <div className="stat-card channel-google fade-in-up-1">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FF4D00' }}>{tr('dashboard.channel.gAds')}</p>
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
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4F7EFF' }}>{tr('dashboard.channel.meta')}</p>
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
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10B981' }}>{tr('dashboard.channel.email')}</p>
                          {loadingChannels.klaviyo
                            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-subtle)' }} />
                            : <span className="w-2 h-2 rounded-full" style={{ background: klaviyo?.current ? '#22C55E' : 'var(--text-subtle)', boxShadow: klaviyo?.current ? '0 0 6px rgba(34,197,94,0.6)' : 'none' }} />
                          }
                        </div>
                        {klaviyo?.current ? (
                          <div className="space-y-2.5">
                            {([[tr('dashboard.channelLabel.delivered'), fmt(klaviyo.current.delivered, 0)], [tr('dashboard.channelLabel.openRate'), `${fmt(klaviyo.current.open_rate)}%`], [tr('dashboard.channelLabel.ctor'), `${fmt(klaviyo.current.ctor)}%`]] as [string, string][]).map(([k, v]) => (
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
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>{tr('dashboard.channel.gsc')}</p>
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

                    {/* Pipeline value + funnel stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      {[
                        { label: tr('dashboard.pipeline.estimatedValue'), value: pipeline?.estimated_value ?? 0, isEur: true },
                        { label: tr('dashboard.pipeline.leads'), value: pipeline?.total_leads ?? totalLeads },
                        { label: tr('dashboard.pipeline.clicks'), value: (gAds?.clicks ?? 0) + (meta?.clicks ?? 0) },
                        { label: tr('dashboard.pipeline.momLeads'), value: momLeads, isPct: true },
                      ].map(item => (
                        <div key={item.label} className="stat-card py-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            {loadingPipeline && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                          </div>
                          {loadingPipeline ? (
                            <>
                              <ValueSkeleton wide={'isEur' in item && item.isEur} />
                              {'isEur' in item && item.isEur && (
                                <div className="h-3 w-44 skeleton-shimmer rounded mt-2" />
                              )}
                            </>
                          ) : 'isPct' in item && item.isPct ? (
                            <p className={`text-xl font-bold ${momLeads != null && momLeads >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {momLeads != null ? `${momLeads >= 0 ? '+' : ''}${fmt(momLeads)}%` : '—'}
                            </p>
                          ) : 'isEur' in item && item.isEur ? (
                            <>
                              <p className="text-xl font-bold text-foreground">{fmtEur(item.value as number)}</p>
                              {pipeline?.deal_value && (
                                <p className="text-xs text-muted-foreground mt-1">{tr('dashboard.pipeline.dealValueNote').replace('{value}', fmt(pipeline.deal_value, 0))}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xl font-bold text-foreground">{fmt(item.value as number, 0)}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 6-month leads trend */}
                    {(loadingOverviewCharts || monthlyLeadsChart.length > 0) && (
                      <div className="stat-card mb-8">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.monthlyLeads')}</p>
                          {loadingOverviewCharts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <p className="text-muted-foreground text-xs mb-4">{tr('dashboard.chart.monthlyLeadsDesc')}</p>
                        <ChartFrame loading={loadingOverviewCharts} height={240} chartKey={`monthly-${chartKey}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyLeadsChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                              <XAxis dataKey="label" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: tooltipText, fontSize: 12 }}
                                formatter={(v: number, name: string) => [fmt(v, 0), name === 'gAds' ? tr('dashboard.channel.gAds') : name === 'meta' ? tr('dashboard.channel.meta') : tr('dashboard.stat.totalLeads')]}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                              />
                              <Legend wrapperStyle={{ fontSize: 12, color: chartTick }} />
                              <Bar dataKey="gAds" name={tr('dashboard.channel.gAds')} stackId="leads" fill="#FF4D00" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                              <Bar dataKey="meta" name={tr('dashboard.channel.meta')} stackId="leads" fill="#4F7EFF" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartFrame>
                      </div>
                    )}

                    {/* MoM by channel */}
                    {(loadingOverviewCharts || momChartData.length > 0) && (
                      <div className="stat-card mb-8">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.momByChannel')}</p>
                          {loadingOverviewCharts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <p className="text-muted-foreground text-xs mb-4">{tr('dashboard.chart.momByChannelDesc')}</p>
                        <ChartFrame loading={loadingOverviewCharts} height={220} chartKey={`mom-${chartKey}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={momChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                              <XAxis type="number" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v)}%`} />
                              <YAxis type="category" dataKey="channel" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                formatter={(v: number) => [`${v >= 0 ? '+' : ''}${fmt(v)}%`, tr('dashboard.pipeline.momLeads')]}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                              />
                              <Bar dataKey="growth" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                                {momChartData.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartFrame>
                      </div>
                    )}

                    {/* Daily leads trend */}
                    {(loadingDaily || dailyLeadsChart.length > 0) && (
                      <div className="stat-card mb-8">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.leadsTrend')}</p>
                          {loadingDaily && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <p className="text-muted-foreground text-xs mb-4">{tr('dashboard.chart.leadsTrendDesc')}</p>
                        <ChartFrame loading={loadingDaily} height={220} chartKey={`daily-${chartKey}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyLeadsChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                              <XAxis dataKey="label" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                              <YAxis tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: tooltipText, fontSize: 12 }}
                                formatter={(v: number, name: string) => [fmt(v, 0), name === 'gAds' ? tr('dashboard.channel.gAds') : name === 'meta' ? tr('dashboard.channel.meta') : tr('dashboard.stat.totalLeads')]}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                              />
                              <Legend wrapperStyle={{ fontSize: 12, color: chartTick }} />
                              <Line type="monotone" dataKey="total" name={tr('dashboard.stat.totalLeads')} stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
                              <Line type="monotone" dataKey="gAds" name={tr('dashboard.channel.gAds')} stroke="#FF4D00" strokeWidth={1.5} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
                              <Line type="monotone" dataKey="meta" name={tr('dashboard.channel.meta')} stroke="#4F7EFF" strokeWidth={1.5} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartFrame>
                      </div>
                    )}

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Spend by Channel */}
                      <div className="stat-card">
                        <div className="flex items-center justify-between mb-6">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.spendByChannel')}</p>
                          {loadingBottomCharts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <ChartFrame loading={loadingBottomCharts} height={220} chartKey={`spend-${chartKey}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={spendChartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                              <XAxis dataKey="channel" tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${fmt(v, 0)}`} />
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: tooltipText, fontSize: 12 }}
                                formatter={(v: number) => [fmtEur(v), tr('dashboard.channelLabel.spend')]}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                              />
                              <Bar dataKey="spend" fill="#FF4D00" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartFrame>
                      </div>

                      {/* Leads / Conversions by Channel */}
                      <div className="stat-card">
                        <div className="flex items-center justify-between mb-6">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.leadsByChannel')}</p>
                          {loadingBottomCharts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <ChartFrame loading={loadingBottomCharts} height={220} chartKey={`leads-bar-${chartKey}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leadsChartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                              <XAxis dataKey="channel" tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: tooltipText, fontSize: 12 }}
                                formatter={(v: number) => [fmt(v, 0), tr('dashboard.channelLabel.leads')]}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                              />
                              <Bar dataKey="leads" fill="#10B981" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartFrame>
                      </div>
                    </div>

                    {/* Kanaalverdeling — Spend Distribution donut */}
                    {(loadingBottomCharts || spendPieData.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <div className="stat-card">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.channelSpendPct')}</p>
                          {loadingBottomCharts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        {loadingBottomCharts ? (
                          <ChartSkeleton height={200} />
                        ) : (
                        <div key={`pie-${chartKey}`} className="flex items-center gap-6">
                          <div style={{ width: '50%', height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={spendPieData}
                                  cx="50%" cy="50%"
                                  innerRadius={55} outerRadius={80}
                                  paddingAngle={3}
                                  dataKey="value"
                                  isAnimationActive={false}
                                >
                                  {spendPieData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                  labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                  itemStyle={{ color: tooltipText, fontSize: 12 }}
                                  formatter={(v: number) => [fmtEur(v), tr('dashboard.channelLabel.spend')]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
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
                        )}
                      </div>

                      {/* CTR comparison */}
                      <div className="stat-card">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr('dashboard.chart.ctrByChannel')}</p>
                          {loadingBottomCharts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <ChartFrame loading={loadingBottomCharts} height={200} chartKey={`ctr-${chartKey}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={ctrChartData}
                              margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                              <XAxis dataKey="channel" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v)}%`} />
                              <Tooltip
                                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 10, color: tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}
                                labelStyle={{ color: tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: tooltipText, fontSize: 12 }}
                                formatter={(v: number) => [`${fmt(v)}%`, tr('dashboard.channelLabel.ctr')]}
                                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                              />
                              <Bar dataKey="ctr" fill="#8B5CF6" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartFrame>
                      </div>
                    </div>
                    )}

                    {/* Insights */}
                    {insights.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-foreground font-bold text-base">{tr('dashboard.insights.title')}</p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                            {insights.length} {insights.length === 1 ? tr('dashboard.insights.one') : tr('dashboard.insights.many')}
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
