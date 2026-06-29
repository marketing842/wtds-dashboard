'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { MetricKpi } from '@/components/MetricLabel'
import { useDateRange } from '@/lib/date-range-context'
import { MousePointerClick, Eye, Euro, Target, Loader2, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, Cell, Rectangle,
} from 'recharts'

import { apiFetch } from '@/lib/api'
import { DateRangeLabel } from '@/components/DateRangeLabel'
import { useLanguage } from '@/lib/language-context'
import { useChartColors, shortDate } from '@/lib/chart-theme'

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

const MATCH_BADGE: Record<string, { key: string; color: string }> = {
  EXACT:  { key: 'campaigns.match.exact',  color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  BROAD:  { key: 'campaigns.match.broad',  color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  PHRASE: { key: 'campaigns.match.phrase', color: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30' },
}

export default function CampaignsPage() {
  const { startDate, endDate } = useDateRange()
  const { t } = useLanguage()
  const chart = useChartColors()
  const [summary, setSummary] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [keywords, setKeywords] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [impressionShare, setImpressionShare] = useState<any>(null)
  const [brandUplift, setBrandUplift] = useState<any>(null)
  const [conversionTypes, setConversionTypes] = useState<any[]>([])
  const [channelBenchmarks, setChannelBenchmarks] = useState<any[]>([])
  const [demographics, setDemographics] = useState<any>(null)
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
        const [sumRes, sumPrevRes, campRes, dailyRes, isRes, brandRes, convRes, benchRes, demoRes] = await Promise.all([
          apiFetch(`/api/google-ads/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/google-ads/summary?start=${prev_start}&end=${prev_end}`),
          apiFetch(`/api/google-ads/campaigns?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/google-ads/daily?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/google-ads/impression-share?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/brand-uplift?start=${startDate}&end=${endDate}&compare_start=${prev_start}&compare_end=${prev_end}`),
          apiFetch(`/api/google-ads/conversions?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/google-ads/channel-benchmarks?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/google-ads/demographics?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) throw new Error(`Google Ads: ${sumRes.status}`)
        const [s, sp, c, d, is, brand, conv, bench, demo] = await Promise.all([
          sumRes.json(),
          sumPrevRes.ok ? sumPrevRes.json() : null,
          campRes.ok ? campRes.json() : [],
          dailyRes.ok ? dailyRes.json() : [],
          isRes.ok ? isRes.json() : null,
          brandRes.ok ? brandRes.json() : null,
          convRes.ok ? convRes.json() : [],
          benchRes.ok ? benchRes.json() : [],
          demoRes.ok ? demoRes.json() : null,
        ])
        setSummary({ current: s, prev: sp })
        setCampaigns(c)
        setDaily(d)
        setImpressionShare(is)
        setBrandUplift(brand)
        setConversionTypes(conv)
        setChannelBenchmarks(bench)
        setDemographics(demo)
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
        setKwError(t('campaigns.kwError'))
      }
    } finally {
      setKwLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = setTimeout(() => fetchKeywords(startDate, endDate), 600)
    return () => clearTimeout(timer)
  }, [startDate, endDate, fetchKeywords, t])

  const cur = summary?.current
  const prev = summary?.prev

  const active = campaigns.filter(c => c.status === 'ENABLED')
  const pausedCount = campaigns.filter(c => c.status === 'PAUSED').length

  const topKeywords = [...keywords]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  const dailyChart = daily.map(d => ({
    ...d,
    label: shortDate(d.date),
    impressionsK: (d.impressions ?? 0) / 1000,
  }))

  function DailyPerformanceTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    if (!row) return null
    const cpa = row.conversions > 0 ? row.cost / row.conversions : null
    return (
      <div style={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBdr}`, borderRadius: 10, color: chart.tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>{row.label}</p>
        <p style={{ fontSize: 12, margin: '2px 0' }}>{t('campaigns.stat.clicks')}: {fmt(row.clicks, 0)}</p>
        <p style={{ fontSize: 12, margin: '2px 0' }}>{t('campaigns.stat.conversions')}: {fmt(row.conversions, 0)}</p>
        <p style={{ fontSize: 12, margin: '2px 0' }}>{t('campaigns.stat.cost')}: {fmtEur(row.cost)}</p>
        <p style={{ fontSize: 12, margin: '2px 0' }}>{t('campaigns.stat.impressions')}: {fmt(row.impressions ?? 0, 0)}</p>
        <p style={{ fontSize: 12, margin: '2px 0' }}>{t('campaigns.stat.cpa')}: {cpa != null ? fmtEur(cpa) : '—'}</p>
      </div>
    )
  }

  const branded = brandUplift?.branded
  const brandTrend = (brandUplift?.trend ?? []).map((d: any) => ({
    ...d,
    label: shortDate(d.date),
  }))

  const benchmarkChart = channelBenchmarks.map(b => ({
    name: b.label,
    ctr: Math.round(b.ctr * 10) / 10,
    benchmark: b.benchmark_ctr,
  }))
  const benchmarkYMax = benchmarkChart.length
    ? Math.max(...benchmarkChart.flatMap(b => [b.ctr, b.benchmark]), 6) * 1.12
    : 10

  function BenchmarkTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload as { name: string; ctr: number; benchmark: number }
    if (!row) return null
    const above = row.ctr >= row.benchmark
    const ctrColor = above ? '#10B981' : '#FF4D00'
    return (
      <div style={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBdr}`, borderRadius: 10, color: chart.tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>{row.name}</p>
        <p style={{ fontSize: 12, margin: '2px 0', color: ctrColor }}>{t('campaigns.stat.ctr')}: {fmt(row.ctr)}%</p>
        <p style={{ fontSize: 12, margin: '2px 0', color: '#A78BFA' }}>{t('campaigns.benchmarkLine')}: {fmt(row.benchmark)}%</p>
      </div>
    )
  }

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBdr}`, borderRadius: 10, color: chart.tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' },
    labelStyle: { color: chart.tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 },
    itemStyle: { color: chart.tooltipText, fontSize: 12 },
  }

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header title={t('campaigns.title')} description={t('campaigns.desc')} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 page-in">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">{t('campaigns.loading')}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error} {t('campaigns.backendQ')}
              </div>
            )}

            {!loading && !error && cur && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    label={t('campaigns.stat.impressions')}
                    tooltipKey="tooltip.impressions"
                    value={cur.impressions >= 1000 ? `${fmt(cur.impressions / 1000)}K` : fmt(cur.impressions, 0)}
                    change={pctChg(cur.impressions, prev?.impressions) != null ? { value: Math.abs(pctChg(cur.impressions, prev?.impressions)!), isPositive: pctChg(cur.impressions, prev?.impressions)! >= 0 } : undefined}
                    icon={Eye}
                  />
                  <StatCard
                    label={t('campaigns.stat.clicks')}
                    tooltipKey="tooltip.clicks"
                    value={fmt(cur.clicks, 0)}
                    change={pctChg(cur.clicks, prev?.clicks) != null ? { value: Math.abs(pctChg(cur.clicks, prev?.clicks)!), isPositive: pctChg(cur.clicks, prev?.clicks)! >= 0 } : undefined}
                    icon={MousePointerClick}
                  />
                  <StatCard
                    label={t('campaigns.stat.cost')}
                    tooltipKey="tooltip.spend"
                    value={fmtEur(cur.cost)}
                    change={pctChg(cur.cost, prev?.cost) != null ? { value: Math.abs(pctChg(cur.cost, prev?.cost)!), isPositive: pctChg(cur.cost, prev?.cost)! <= 0 } : undefined}
                    icon={Euro}
                  />
                  <StatCard
                    label={t('campaigns.stat.conversions')}
                    tooltipKey="tooltip.conversions"
                    value={fmt(cur.conversions, 0)}
                    change={pctChg(cur.conversions, prev?.conversions) != null ? { value: Math.abs(pctChg(cur.conversions, prev?.conversions)!), isPositive: pctChg(cur.conversions, prev?.conversions)! >= 0 } : undefined}
                    icon={Target}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  <MetricKpi label={t('campaigns.stat.ctr')} value={`${fmt(cur.ctr)}%`} tooltipKey="tooltip.ctr" />
                  <MetricKpi label={t('campaigns.stat.avgCpc')} value={fmtEur(cur.avg_cpc)} tooltipKey="tooltip.kpk" />
                  <MetricKpi label={t('campaigns.stat.cpa')} value={cur.conversions > 0 ? fmtEur(cur.cpa) : '—'} tooltipKey="tooltip.kpa" accent />
                </div>

                {/* Impression share */}
                {impressionShare && (impressionShare.won > 0 || impressionShare.lost_budget > 0) && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('campaigns.chart.impressionShare')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('campaigns.chart.impressionShareDesc')}</p>
                    <div className="flex h-8 rounded-lg overflow-hidden mb-3">
                      {impressionShare.won > 0 && (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-white" style={{ width: `${impressionShare.won}%`, background: '#FF4D00', minWidth: impressionShare.won > 8 ? undefined : '2rem' }}>
                          {impressionShare.won >= 12 ? `${fmt(impressionShare.won)}%` : ''}
                        </div>
                      )}
                      {impressionShare.lost_budget > 0 && (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-amber-950" style={{ width: `${impressionShare.lost_budget}%`, background: '#FBBF24', minWidth: impressionShare.lost_budget > 8 ? undefined : '2rem' }}>
                          {impressionShare.lost_budget >= 12 ? `${fmt(impressionShare.lost_budget)}%` : ''}
                        </div>
                      )}
                      {impressionShare.lost_rank > 0 && (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-white" style={{ width: `${impressionShare.lost_rank}%`, background: '#64748B', minWidth: impressionShare.lost_rank > 8 ? undefined : '2rem' }}>
                          {impressionShare.lost_rank >= 12 ? `${fmt(impressionShare.lost_rank)}%` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FF4D00' }} />{t('campaigns.is.won')} {fmt(impressionShare.won)}%</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />{t('campaigns.is.budget')} {fmt(impressionShare.lost_budget)}%</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />{t('campaigns.is.rank')} {fmt(impressionShare.lost_rank)}%</span>
                    </div>
                  </div>
                )}

                {/* Daily performance — single chart */}
                {dailyChart.length > 0 && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('campaigns.chart.dailyPerformance')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('campaigns.chart.dailyPerformanceDesc')} · <DateRangeLabel start={startDate} end={endDate} /></p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={dailyChart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis yAxisId="volume" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis yAxisId="cost" orientation="right" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${fmt(v, 0)}`} />
                        <Tooltip content={<DailyPerformanceTooltip />} cursor={{ fill: chart.cursorFill }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                        <Bar yAxisId="volume" dataKey="clicks" name={t('campaigns.stat.clicks')} fill="#FF4D00" radius={[3, 3, 0, 0]} barSize={8} />
                        <Bar yAxisId="volume" dataKey="conversions" name={t('campaigns.stat.conversions')} fill="#10B981" radius={[3, 3, 0, 0]} barSize={8} />
                        <Line yAxisId="cost" type="monotone" dataKey="cost" name={t('campaigns.stat.cost')} stroke="#F59E0B" strokeWidth={2} dot={false} />
                        <Line yAxisId="volume" type="monotone" dataKey="impressionsK" name={t('campaigns.chart.impressionsK')} stroke="#8B5CF6" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Channel CTR benchmarks */}
                {benchmarkChart.length > 0 && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('campaigns.channelBenchmarks')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('campaigns.channelBenchmarksDesc')}</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={benchmarkChart} barGap={6} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v)}%`} domain={[0, benchmarkYMax]} />
                        <Tooltip content={<BenchmarkTooltip />} cursor={{ fill: chart.cursorFill }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                        <Bar dataKey="benchmark" name={t('campaigns.benchmarkLine')} fill="#8B5CF6" fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Bar
                          dataKey="ctr"
                          name={t('campaigns.stat.ctr')}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                          activeBar={(props: any) => {
                            const row = benchmarkChart[props.index]
                            const fill = row && row.ctr >= row.benchmark ? '#059669' : '#EA580C'
                            return <Rectangle {...props} fill={fill} stroke={fill} strokeWidth={1} />
                          }}
                        >
                          {benchmarkChart.map((entry, i) => (
                            <Cell key={i} fill={entry.ctr >= entry.benchmark ? '#10B981' : '#FF4D00'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Conversion types */}
                {conversionTypes.length > 0 && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('campaigns.conversionTypes')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('campaigns.conversionTypesDesc')}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px] text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.table.keyword')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.stat.conversions')}</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.stat.cost')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversionTypes.map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0">
                              <td className="px-4 py-3 text-foreground font-medium">{row.name}</td>
                              <td className="px-4 py-3 text-right">{fmt(row.conversions, 0)}</td>
                              <td className="px-4 py-3 text-right">{row.value > 0 ? fmtEur(row.value) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Demographics */}
                {demographics && (demographics.devices?.length > 0 || demographics.ages?.length > 0 || demographics.genders?.length > 0) && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('campaigns.demographics')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('campaigns.demographicsDesc')}</p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {[
                        { key: 'devices', title: t('campaigns.demo.devices'), data: demographics.devices },
                        { key: 'ages', title: t('campaigns.demo.ages'), data: demographics.ages },
                        { key: 'genders', title: t('campaigns.demo.genders'), data: demographics.genders },
                      ].filter(s => s.data?.length > 0).map(section => (
                        <div key={section.key}>
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{section.title}</p>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={section.data.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                              <XAxis type="number" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="label" tick={{ fill: chart.tick, fontSize: 10 }} width={72} axisLine={false} tickLine={false} />
                              <Tooltip {...tooltipStyle} formatter={(v: number) => [fmt(v, 0), t('campaigns.stat.impressions')]} />
                              <Bar dataKey="impressions" fill="#FF4D00" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand uplift */}
                {branded?.configured && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('campaigns.brand.title')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('campaigns.brand.desc')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div className="rounded-lg p-3" style={{ background: 'var(--border)' }}>
                        <p className="text-xs text-muted-foreground mb-1">{t('campaigns.brand.clicks')}</p>
                        <p className="text-xl font-bold text-foreground">{fmt(branded.clicks, 0)}</p>
                        {branded.growth_pct != null && (
                          <p className={`text-xs mt-1 ${branded.growth_pct >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {branded.growth_pct >= 0 ? '+' : ''}{fmt(branded.growth_pct)}% {t('common.vsPrev')}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg p-3" style={{ background: 'var(--border)' }}>
                        <p className="text-xs text-muted-foreground mb-1">{t('campaigns.brand.ctr')}</p>
                        <p className="text-xl font-bold text-accent">{fmt(branded.ctr)}%</p>
                      </div>
                      {brandUplift?.direct && (
                        <div className="rounded-lg p-3" style={{ background: 'var(--border)' }}>
                          <p className="text-xs text-muted-foreground mb-1">{t('campaigns.brand.direct')}</p>
                          <p className="text-xl font-bold text-foreground">{fmt(brandUplift.direct.sessions, 0)}</p>
                          {brandUplift.direct.growth_pct != null && (
                            <p className={`text-xs mt-1 ${brandUplift.direct.growth_pct >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {brandUplift.direct.growth_pct >= 0 ? '+' : ''}{fmt(brandUplift.direct.growth_pct)}%
                            </p>
                          )}
                        </div>
                      )}
                      <div className="rounded-lg p-3" style={{ background: 'var(--border)' }}>
                        <p className="text-xs text-muted-foreground mb-1">{t('campaigns.brand.terms')}</p>
                        <p className="text-sm font-medium text-foreground truncate">{branded.terms.join(', ')}</p>
                      </div>
                    </div>
                    {brandTrend.length > 0 && (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={brandTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...tooltipStyle} formatter={(v: number) => [fmt(v, 0), t('campaigns.brand.clicks')]} cursor={{ fill: chart.cursorFill }} />
                          <Line type="monotone" dataKey="clicks" stroke="#FF4D00" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}

                {/* Top Keywords */}
                <div className="mb-8">
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-lg">{t('campaigns.topKeywords')}</p>
                    <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /> · {t('campaigns.topKeywordsDesc')}</p>
                  </div>

                  {kwLoading && (
                    <div className="flex items-center gap-3 py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      <span className="text-muted-foreground text-sm">{t('campaigns.kwLoading')}</span>
                    </div>
                  )}

                  {kwError && (
                    <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-lg px-4 py-3">
                      <span className="text-zinc-500 text-sm">{t('campaigns.keywordsUnavailable')}</span>
                      <button
                        onClick={() => fetchKeywords(startDate, endDate)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#FF4D00] hover:text-orange-400 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> {t('campaigns.retry')}
                      </button>
                    </div>
                  )}

                  {!kwLoading && !kwError && (
                    topKeywords.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t('campaigns.noKeywords')}</p>
                    ) : (
                      <div className="stat-card p-0 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">{t('campaigns.table.keyword')}</th>
                              <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.table.match')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.table.clicks')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.table.ctr')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.table.avgCpc')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('campaigns.table.conv')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3">{t('campaigns.table.cost')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topKeywords.map((kw, i) => {
                              const badge = MATCH_BADGE[kw.match_type]
                              const badgeLabel = badge ? t(badge.key) : kw.match_type
                              const badgeColor = badge?.color ?? 'bg-slate-500/20 text-muted-foreground border-slate-500/30'
                              return (
                                <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors">
                                  <td className="px-5 py-3 text-foreground font-medium">{kw.text}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                      {badgeLabel}
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
                    <p className="text-foreground font-bold text-lg">{t('campaigns.activeCampaigns')}</p>
                    <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /> · {active.length} {t('campaigns.active')}{pausedCount > 0 ? `, ${pausedCount} ${t('campaigns.paused')}` : ''}</p>
                  </div>

                  <div className="space-y-4">
                    {active.map(c => (
                      <div key={c.id} className="stat-card">
                        <div className="flex items-start justify-between mb-5">
                          <p className="text-foreground font-semibold text-base">{c.name}</p>
                          <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0 ml-4">
                            {t('campaigns.badge.active')}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                          {[
                            { label: t('campaigns.stat.impressions'), value: c.impressions >= 1000 ? `${fmt(c.impressions / 1000)}K` : String(c.impressions) },
                            { label: t('campaigns.stat.clicks'), value: String(c.clicks) },
                            { label: t('campaigns.stat.ctr'), value: `${fmt(c.ctr)}%` },
                            { label: t('campaigns.stat.cost'), value: fmtEur(c.cost) },
                            { label: t('campaigns.stat.conversions'), value: String(c.conversions) },
                            { label: t('campaigns.stat.cpa'), value: c.conversions > 0 ? fmtEur(c.cpa) : '—', accent: true },
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
                    + {pausedCount} {pausedCount !== 1 ? t('campaigns.pausedNotShownPlural') : t('campaigns.pausedNotShown')}
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
