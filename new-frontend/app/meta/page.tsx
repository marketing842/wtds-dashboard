'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { DateRangeLabel } from '@/components/DateRangeLabel'
import { MetricKpi } from '@/components/MetricLabel'
import { useDateRange } from '@/lib/date-range-context'
import { Eye, MousePointerClick, Euro, Loader2, ShoppingCart, Film, Image } from 'lucide-react'
import {
  BarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, ReferenceLine,
} from 'recharts'

import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'
import { useChartColors, truncateLabel } from '@/lib/chart-theme'

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
const RETENTION_LINE_COLORS = ['#FF4D00', '#4F7EFF', '#10B981']

function retentionTickVisible(label: string) {
  if (label === '60s+' || label.includes('–')) return true
  const sec = parseInt(label, 10)
  if (Number.isNaN(sec)) return false
  return sec === 0 || sec % 5 === 0
}

function buildRetentionCompareChart(curves: any[]) {
  const labels = curves[0]?.retention_curve?.map((p: any) => p.label) ?? []
  return labels.map(label => {
    const row: Record<string, string | number | null> = { label }
    curves.forEach((ad, i) => {
      const pt = ad.retention_curve?.find((p: any) => p.label === label)
      row[`ad${i}`] = pt?.pct ?? null
    })
    return row
  })
}

function RetentionDot(props: any) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return null
  const marker = payload?.label === '3s' || payload?.label === '15s'
  if (!marker) return <circle cx={cx} cy={cy} r={2} fill={props.stroke ?? '#FF4D00'} />
  const fill = payload.label === '3s' ? '#FF4D00' : '#8B5CF6'
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1.5} />
}

export default function MetaPage() {
  const { startDate, endDate } = useDateRange()
  const { t, fmt, fmtEur, fmtK, shortDate } = useLanguage()
  const chart = useChartColors()
  const [summary, setSummary] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [creatives, setCreatives] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [creativesChart, setCreativesChart] = useState<any[]>([])
  const [adsCount, setAdsCount] = useState<{ current: number; previous: number | null } | null>(null)
  const [demographics, setDemographics] = useState<any>(null)
  const [retentionCurves, setRetentionCurves] = useState<any[]>([])
  const [selectedRetention, setSelectedRetention] = useState(0)
  const [retentionView, setRetentionView] = useState<'single' | 'compare'>('single')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { ps, pe } = getPrevRange(startDate, endDate)
        const [sumRes, sumPrevRes, campRes, creativeRes, dailyRes, chartRes, adsCountRes, demoRes, retentionRes] = await Promise.all([
          apiFetch(`/api/meta/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/summary?start=${ps}&end=${pe}`),
          apiFetch(`/api/meta/campaign-tree?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/creatives?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/daily?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/creatives-chart?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/ads-count?start=${startDate}&end=${endDate}&compare_start=${ps}&compare_end=${pe}`),
          apiFetch(`/api/meta/demographics?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/meta/retention-curves?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          const code = body?.code ? ` (code ${body.code})` : ''
          throw new Error((body?.error ?? `HTTP ${sumRes.status}`) + code)
        }
        const [s, sp, c, cr, d, cc, ac, demo, retention] = await Promise.all([
          sumRes.json(),
          sumPrevRes.ok ? sumPrevRes.json() : null,
          campRes.ok ? campRes.json() : [],
          creativeRes.ok ? creativeRes.json() : [],
          dailyRes.ok ? dailyRes.json() : [],
          chartRes.ok ? chartRes.json() : [],
          adsCountRes.ok ? adsCountRes.json() : null,
          demoRes.ok ? demoRes.json() : null,
          retentionRes.ok ? retentionRes.json() : [],
        ])
        setSummary({ cur: s, prev: sp })
        setCampaigns(c)
        setCreatives(cr)
        setDaily(d)
        setCreativesChart(cc.filter((x: any) => x.is_video && x.thumbstop_rate != null))
        setAdsCount(ac)
        setDemographics(demo)
        setRetentionCurves(Array.isArray(retention) ? retention : [])
        setSelectedRetention(0)
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
  const visibleCampaigns = campaigns.filter(c => c.status === 'ACTIVE' || c.spend > 0 || c.impressions > 0)
  const hiddenInactiveCount = campaigns.length - visibleCampaigns.length

  const isLeadsCampaign = cur ? (cur.leads > 0 || cur.purchase_value === 0) : false
  const cpl = cur && cur.leads > 0 && cur.spend > 0 ? cur.spend / cur.leads : 0

  const dailyChart = daily.map(d => ({
    ...d,
    label: shortDate(d.date),
    leads: d.leads ?? 0,
  }))

  const thumbChart = creativesChart.map(c => ({
    name: truncateLabel(c.name),
    thumbstop: Math.round((c.thumbstop_rate ?? 0) * 10) / 10,
    hold: Math.round((c.hold_rate ?? 0) * 10) / 10,
  }))

  const ageChart = (demographics?.ages ?? []).slice(0, 8).map((a: any) => ({
    age: a.age,
    impressions: a.impressions,
    clicks: a.clicks,
  }))

  const activeRetention = retentionCurves[selectedRetention] ?? null
  const retentionChart = activeRetention?.retention_curve ?? []
  const retentionCompareChart = buildRetentionCompareChart(retentionCurves)

  const retentionXAxis = {
    dataKey: 'label' as const,
    tick: { fill: chart.tick, fontSize: 10 },
    axisLine: false as const,
    tickLine: false as const,
    interval: 0 as const,
    angle: -35,
    textAnchor: 'end' as const,
    height: 48,
    tickFormatter: (label: string) => (retentionTickVisible(label) ? label : ''),
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
        <Header title={t('meta.title')} description={t('meta.desc')} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 page-in">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">{t('meta.loading')}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error}
              </div>
            )}

            {!loading && !error && cur && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    label={t('meta.stat.impressions')}
                    tooltipKey="tooltip.impressions"
                    value={<AnimatedNumber value={cur.impressions} delay={0} formatter={n => fmtK(n)} />}
                    change={pctChg(cur.impressions, prev?.impressions) != null ? { value: Math.abs(pctChg(cur.impressions, prev?.impressions)!), isPositive: pctChg(cur.impressions, prev?.impressions)! >= 0 } : undefined}
                    icon={Eye} delay={0}
                  />
                  <StatCard
                    label={t('meta.stat.clicks')}
                    tooltipKey="tooltip.clicks"
                    value={<AnimatedNumber value={cur.clicks} delay={100} />}
                    change={pctChg(cur.clicks, prev?.clicks) != null ? { value: Math.abs(pctChg(cur.clicks, prev?.clicks)!), isPositive: pctChg(cur.clicks, prev?.clicks)! >= 0 } : undefined}
                    icon={MousePointerClick} delay={100}
                  />
                  <StatCard
                    label={t('meta.stat.spend')}
                    tooltipKey="tooltip.spend"
                    value={<AnimatedNumber value={cur.spend} delay={200} formatter={n => fmtEur(n)} />}
                    change={pctChg(cur.spend, prev?.spend) != null ? { value: Math.abs(pctChg(cur.spend, prev?.spend)!), isPositive: pctChg(cur.spend, prev?.spend)! <= 0 } : undefined}
                    icon={Euro} delay={200}
                  />
                  <StatCard
                    label={cur.leads > 0 ? t('meta.stat.leads') : t('meta.stat.purchases')}
                    tooltipKey={cur.leads > 0 ? 'tooltip.leads' : 'tooltip.conversions'}
                    value={<AnimatedNumber value={cur.leads > 0 ? cur.leads : cur.purchases} delay={300} />}
                    change={(() => {
                      const v = cur.leads > 0 ? pctChg(cur.leads, prev?.leads) : pctChg(cur.purchases, prev?.purchases)
                      return v != null ? { value: Math.abs(v), isPositive: v >= 0 } : undefined
                    })()}
                    icon={ShoppingCart} delay={300}
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <MetricKpi label={t('meta.stat.frequency')} value={cur.frequency > 0 ? fmt(cur.frequency) : '—'} tooltipKey="tooltip.frequency" />
                  <MetricKpi label={t('meta.stat.cpm')} value={cur.cpm > 0 ? fmtEur(cur.cpm) : '—'} tooltipKey="tooltip.kpm" />
                  <MetricKpi label={t('meta.stat.uniqueCtr')} value={cur.unique_ctr > 0 ? `${fmt(cur.unique_ctr)}%` : '—'} tooltipKey="tooltip.uniqueCtr" />
                  <MetricKpi label={t('meta.stat.ctr')} value={`${fmt(cur.ctr)}%`} tooltipKey="tooltip.ctr" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <MetricKpi label={t('meta.stat.cpc')} value={fmtEur(cur.cpc)} tooltipKey="tooltip.kpk" />
                  {isLeadsCampaign
                    ? <MetricKpi label={t('meta.stat.cpl')} value={cpl > 0 ? fmtEur(cpl) : '—'} tooltipKey="tooltip.kpl" accent />
                    : <MetricKpi label={t('meta.stat.roas')} value={cur.roas > 0 ? `${fmt(cur.roas)}x` : '—'} tooltipKey="tooltip.roas" accent />}
                  {isLeadsCampaign
                    ? <MetricKpi label={t('meta.stat.leads')} value={fmt(cur.leads, 0)} tooltipKey="tooltip.leads" />
                    : <MetricKpi label={t('meta.stat.revenue')} value={cur.purchase_value > 0 ? fmtEur(cur.purchase_value) : '—'} tooltipKey="tooltip.roas" />}
                  <MetricKpi label={t('meta.stat.reach')} value={cur.reach >= 1000 ? `${fmt(cur.reach / 1000)}K` : fmt(cur.reach, 0)} tooltipKey="tooltip.reach" />
                </div>

                {adsCount && (
                  <div className="stat-card mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-foreground font-bold text-lg">{t('meta.stat.activeCreatives')}</p>
                      <p className="text-muted-foreground text-sm mt-1">{t('meta.stat.activeCreativesDesc')}</p>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-bold text-accent">{adsCount.current}</p>
                      {adsCount.previous != null && (
                        <p className="text-sm text-muted-foreground">
                          {t('meta.stat.vsLastPeriod')}: <span className={adsCount.current >= adsCount.previous ? 'text-emerald-500 font-semibold' : 'text-red-400 font-semibold'}>{adsCount.previous}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Daily trend + thumbstop chart */}
                {(dailyChart.length > 0 || thumbChart.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {dailyChart.length > 0 && (
                      <div className="stat-card">
                        <p className="text-foreground font-bold text-lg mb-1">{t('meta.chart.dailyTrend')}</p>
                        <p className="text-muted-foreground text-sm mb-4"><DateRangeLabel start={startDate} end={endDate} /></p>
                        <ResponsiveContainer width="100%" height={220}>
                          <ComposedChart data={dailyChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis yAxisId="left" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${fmt(v, 0)}`} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                            <Bar yAxisId="left" dataKey="spend" name={t('meta.stat.spendShort')} fill="#4F7EFF" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="leads" name={t('meta.stat.leads')} stroke="#FF4D00" strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {thumbChart.length > 0 && (
                      <div className="stat-card">
                        <p className="text-foreground font-bold text-lg mb-1">{t('meta.chart.thumbstopHold')}</p>
                        <p className="text-muted-foreground text-sm mb-4">{t('meta.chart.thumbstopHoldDesc')}</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={thumbChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${fmt(v)}%`, '']} cursor={{ fill: chart.cursorFill }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                            <Bar dataKey="thumbstop" name={t('meta.stat.thumbstop')} fill="#FF4D00" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="hold" name={t('meta.stat.holdRate')} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {retentionCurves.length > 0 && (
                  <div className="stat-card mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-foreground font-bold text-lg mb-1">{t('meta.chart.retention')}</p>
                        <p className="text-muted-foreground text-sm">{t('meta.chart.retentionDesc')}</p>
                      </div>
                      {retentionCurves.length > 1 && (
                        <div className="flex rounded-lg border overflow-hidden shrink-0" style={{ borderColor: 'var(--border)' }}>
                          <button
                            type="button"
                            onClick={() => setRetentionView('single')}
                            className={`text-xs px-3 py-1.5 transition-colors ${retentionView === 'single' ? 'bg-accent/20 text-accent font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {t('meta.chart.retentionSingle')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRetentionView('compare')}
                            className={`text-xs px-3 py-1.5 transition-colors border-l ${retentionView === 'compare' ? 'bg-accent/20 text-accent font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                            style={{ borderColor: 'var(--border)' }}
                          >
                            {t('meta.chart.retentionCompare')}
                          </button>
                        </div>
                      )}
                    </div>

                    {retentionView === 'single' && retentionCurves.length > 1 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {retentionCurves.map((ad, i) => (
                          <button
                            key={ad.id}
                            type="button"
                            onClick={() => setSelectedRetention(i)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors max-w-[220px] truncate ${
                              selectedRetention === i
                                ? 'bg-accent/20 text-accent border-accent/40 font-semibold'
                                : 'bg-transparent text-muted-foreground border-border hover:border-accent/30'
                            }`}
                            title={ad.name}
                          >
                            #{i + 1} {truncateLabel(ad.name, 28)}
                          </button>
                        ))}
                      </div>
                    )}

                    {retentionView === 'single' && activeRetention && (
                      <p className="text-foreground text-sm font-medium mb-3 line-clamp-2">{activeRetention.name}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-[#FF4D00]" />
                        {t('meta.chart.retention3s')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-[#8B5CF6]" />
                        {t('meta.chart.retention15s')}
                      </span>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      {retentionView === 'compare' && retentionCurves.length > 1 ? (
                        <LineChart data={retentionCompareChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis {...retentionXAxis} />
                          <YAxis
                            tick={{ fill: chart.tick, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={v => `${v}%`}
                          />
                          <Tooltip
                            {...tooltipStyle}
                            formatter={(v: number, name: string) => {
                              const idx = parseInt(name.replace('ad', ''), 10)
                              const adName = retentionCurves[idx]?.name
                              return [`${fmt(v)}%`, adName ? truncateLabel(adName, 24) : t('meta.chart.retentionY')]
                            }}
                            cursor={{ stroke: chart.grid }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, color: chart.tick }} formatter={(_v, entry) => truncateLabel(retentionCurves[parseInt(String(entry.dataKey).replace('ad', ''), 10)]?.name ?? '', 22)} />
                          <ReferenceLine x="3s" stroke="#FF4D00" strokeDasharray="4 4" strokeOpacity={0.45} />
                          <ReferenceLine x="15s" stroke="#8B5CF6" strokeDasharray="4 4" strokeOpacity={0.45} />
                          {retentionCurves.map((ad, i) => (
                            <Line
                              key={ad.id}
                              type="monotone"
                              dataKey={`ad${i}`}
                              name={`ad${i}`}
                              stroke={RETENTION_LINE_COLORS[i] ?? '#888'}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      ) : (
                        <LineChart data={retentionChart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis {...retentionXAxis} />
                          <YAxis
                            tick={{ fill: chart.tick, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={v => `${v}%`}
                          />
                          <Tooltip
                            {...tooltipStyle}
                            formatter={(v: number) => [`${fmt(v)}%`, t('meta.chart.retentionY')]}
                            cursor={{ stroke: chart.grid }}
                          />
                          <ReferenceLine x="3s" stroke="#FF4D00" strokeDasharray="4 4" strokeOpacity={0.45} />
                          <ReferenceLine x="15s" stroke="#8B5CF6" strokeDasharray="4 4" strokeOpacity={0.45} />
                          <Line
                            type="monotone"
                            dataKey="pct"
                            name={t('meta.chart.retentionY')}
                            stroke="#FF4D00"
                            strokeWidth={2.5}
                            dot={<RetentionDot stroke="#FF4D00" />}
                            activeDot={{ r: 5, fill: '#FF4D00' }}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}

                {ageChart.length > 0 && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('meta.demographics')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('meta.demographicsDesc')}</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={ageChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="age" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                        <Bar dataKey="impressions" name={t('meta.stat.impressions')} fill="#4F7EFF" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="clicks" name={t('meta.stat.clicks')} fill="#FF4D00" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {creatives.length > 0 && (
                  <div className="mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('meta.topAds')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('meta.topAdsDesc')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {creatives.map((ad, i) => (
                        <div key={ad.id} className="stat-card border-t-2 border-t-accent/40 relative">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-2xl font-black ${RANK_COLOR[i]}`}>#{i + 1}</span>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {ad.is_video ? (
                                <span className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                  <Film className="w-3 h-3" /> {t('meta.badge.video')}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                  <Image className="w-3 h-3" /> {t('meta.badge.static')}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                ad.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-500/20 text-muted-foreground border-slate-500/30'
                              }`}>{ad.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}</span>
                            </div>
                          </div>

                          <p className="text-foreground text-sm font-semibold mb-1 leading-snug line-clamp-2">{ad.name}</p>
                          {ad.adset_name && (
                            <p className="text-muted-foreground text-xs mb-4">
                              {t('meta.badge.adset')}: {ad.adset_name}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.spendShort')}</p>
                              <p className="text-foreground text-sm font-bold">{fmtEur(ad.spend)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.ctr')}</p>
                              <p className="text-accent text-sm font-bold">{fmt(ad.ctr)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.impressions')}</p>
                              <p className="text-foreground text-sm font-bold">
                                {ad.impressions >= 1000 ? `${fmt(ad.impressions / 1000)}K` : ad.impressions}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">{ad.leads > 0 ? t('meta.stat.leads') : t('meta.stat.purchases')}</p>
                              <p className="text-foreground text-sm font-bold">{ad.leads > 0 ? ad.leads : ad.purchases}</p>
                            </div>
                            {ad.thumbstop_rate != null && (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.thumbstop')}</p>
                                <p className="text-purple-700 dark:text-purple-300 text-sm font-bold">{fmt(ad.thumbstop_rate)}%</p>
                              </div>
                            )}
                            {ad.hold_rate != null && (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.holdRate')}</p>
                                <p className="text-blue-700 dark:text-blue-300 text-sm font-bold">{fmt(ad.hold_rate)}%</p>
                              </div>
                            )}
                            {ad.avg_watch_sec != null && (
                              <div className="col-span-2">
                                <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.avgWatch')}</p>
                                <p className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">{fmt(ad.avg_watch_sec)}s</p>
                              </div>
                            )}
                            {ad.roas > 0 ? (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.roas')}</p>
                                <p className="text-accent text-sm font-bold">{fmt(ad.roas)}x</p>
                              </div>
                            ) : ad.leads > 0 && ad.spend > 0 ? (
                              <div>
                                <p className="text-muted-foreground text-xs mb-0.5">{t('meta.stat.cpl')}</p>
                                <p className="text-accent text-sm font-bold">{fmtEur(ad.spend / ad.leads)}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-lg">{t('meta.campaigns')}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      <DateRangeLabel start={startDate} end={endDate} /> · {active.length} {t('meta.campaignsActive')}{inactive.length > 0 ? `, ${inactive.length} ${t('meta.campaignsInactive')}` : ''}
                    </p>
                  </div>

                  {visibleCampaigns.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('meta.noCampaigns')}</p>
                  ) : (
                    <div className="space-y-4">
                      {visibleCampaigns.map(c => (
                        <div key={c.id} className="stat-card">
                          <div className="flex items-start justify-between mb-5">
                            <p className="text-foreground font-semibold text-base">{c.name}</p>
                            <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border flex-shrink-0 ml-4 ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-500/20 text-muted-foreground border-slate-500/30'
                            }`}>
                              {c.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-4">
                            {[
                              { label: t('meta.stat.impressions'), value: c.impressions >= 1000 ? `${fmt(c.impressions / 1000)}K` : String(c.impressions) },
                              { label: t('meta.stat.clicks'), value: fmt(c.clicks, 0) },
                              { label: t('meta.stat.ctr'), value: `${fmt(c.ctr)}%` },
                              { label: t('meta.stat.spendShort'), value: fmtEur(c.spend) },
                              { label: isLeadsCampaign ? t('meta.stat.leads') : t('meta.stat.purchases'), value: String(isLeadsCampaign ? c.leads : c.purchases) },
                              c.roas > 0
                                ? { label: t('meta.stat.roas'), value: `${fmt(c.roas)}x`, accent: true }
                                : { label: isLeadsCampaign ? t('meta.stat.cpl') : t('meta.stat.roas'), value: isLeadsCampaign && c.leads > 0 && c.spend > 0 ? fmtEur(c.spend / c.leads) : '—', accent: true },
                            ].map(m => (
                              <div key={m.label}>
                                <p className="text-muted-foreground text-xs mb-1">{m.label}</p>
                                <p className={`font-bold text-base ${m.accent ? 'text-accent' : 'text-foreground'}`}>{m.value}</p>
                              </div>
                            ))}
                          </div>

                          {(c.adsets ?? []).length > 0 && (
                            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('meta.campaignTree.adsets')}</p>
                              <div className="space-y-3">
                                {c.adsets.map((a: any) => (
                                  <div key={a.id} className="rounded-lg p-3" style={{ background: 'var(--border)' }}>
                                    <div className="flex items-start justify-between mb-3">
                                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                        a.status === 'ACTIVE'
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                          : 'bg-slate-500/15 text-muted-foreground border-slate-500/25'
                                      }`}>
                                        {a.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs">
                                      <div><span className="text-muted-foreground">{t('meta.stat.spendShort')}</span><p className="font-semibold">{fmtEur(a.spend)}</p></div>
                                      <div><span className="text-muted-foreground">{t('meta.stat.clicks')}</span><p className="font-semibold">{fmt(a.clicks, 0)}</p></div>
                                      <div><span className="text-muted-foreground">{t('meta.stat.ctr')}</span><p className="font-semibold">{fmt(a.ctr)}%</p></div>
                                      <div><span className="text-muted-foreground">{isLeadsCampaign ? t('meta.stat.leads') : t('meta.stat.purchases')}</span><p className="font-semibold">{isLeadsCampaign ? a.leads : a.purchases}</p></div>
                                      <div><span className="text-muted-foreground">{t('meta.stat.impressions')}</span><p className="font-semibold">{a.impressions >= 1000 ? `${fmt(a.impressions / 1000)}K` : a.impressions}</p></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {hiddenInactiveCount > 0 && (
                    <p className="text-muted-foreground text-sm mt-4">{hiddenInactiveCount} {t('meta.campaignsHiddenInactive')}</p>
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
