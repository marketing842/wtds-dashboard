'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { Mail, MousePointerClick, CheckCircle, TrendingUp, Loader2 } from 'lucide-react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { DateRangeLabel } from '@/components/DateRangeLabel'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'
import { AudiencesSection } from '@/components/AudiencesSection'
import { useChartColors, truncateLabel } from '@/lib/chart-theme'

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

function pctChange(current: number, prev: number | null) {
  if (!prev || prev === 0) return null
  return ((current - prev) / prev) * 100
}

function getPrevRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevEnd = new Date(s)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  return {
    compare_start: prevStart.toISOString().slice(0, 10),
    compare_end: prevEnd.toISOString().slice(0, 10),
  }
}

const MAX_ATTEMPTS = 4
const RETRY_DELAY_MS = 6000

export default function EmailPage() {
  const { startDate, endDate } = useDateRange()
  const { t } = useLanguage()
  const chart = useChartColors()
  const [summary, setSummary] = useState<any>(null)
  const [flows, setFlows] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [slowLoad, setSlowLoad] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Show "taking longer than usual" message after 12 s of loading
  useEffect(() => {
    if (!loading) { setSlowLoad(false); return }
    const t = setTimeout(() => setSlowLoad(true), 12000)
    return () => clearTimeout(t)
  }, [loading])

  useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      setError(null)
      await new Promise(r => setTimeout(r, 600)) // debounce
      if (!active) return

      let lastErr = ''
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
          if (!active) return
        }
        try {
          const { compare_start, compare_end } = getPrevRange(startDate, endDate)
          const [sRes, fRes, cRes] = await Promise.all([
            apiFetch(`/api/klaviyo/summary?start=${startDate}&end=${endDate}&compare_start=${compare_start}&compare_end=${compare_end}`),
            apiFetch(`/api/klaviyo/flows?start=${startDate}&end=${endDate}`),
            apiFetch(`/api/klaviyo/campaigns?start=${startDate}&end=${endDate}`),
          ])
          if (!active) return

          // Retry transparently on rate-limit or server error
          const retryable =
            (!sRes.ok && (sRes.status === 429 || sRes.status >= 500)) ||
            (!fRes.ok && (fRes.status === 429 || fRes.status >= 500)) ||
            (!cRes.ok && (cRes.status === 429 || cRes.status >= 500))
          if (retryable && attempt < MAX_ATTEMPTS - 1) {
            lastErr = `HTTP ${sRes.ok ? fRes.status : sRes.status}`
            continue
          }

          if (!sRes.ok) {
            const body = await sRes.json().catch(() => ({}))
            throw new Error(body?.error ?? `HTTP ${sRes.status}`)
          }
          if (!fRes.ok) {
            const body = await fRes.json().catch(() => ({}))
            throw new Error(body?.error ?? `HTTP ${fRes.status}`)
          }

          const [s, f, c] = await Promise.all([sRes.json(), fRes.json(), cRes.ok ? cRes.json() : []])
          if (!active) return
          setSummary(s)
          setFlows(f)
          setCampaigns(c)
          setLoading(false)
          return // success
        } catch (e: any) {
          if (!active) return
          lastErr = e.message
          if (attempt < MAX_ATTEMPTS - 1) continue
        }
      }
      setError(lastErr || t('email.loadError'))
      setLoading(false)
    })()

    return () => { active = false }
  }, [startDate, endDate])

  const cur = summary?.current
  const prev = summary?.prev

  const bestFlow = flows.length > 0
    ? flows.reduce((best, f) => (f.open_rate > best.open_rate ? f : best), flows[0])
    : null

  const stats = cur ? [
    {
      label: t('email.stat.delivered'),
      tooltipKey: 'tooltip.delivered',
      value: <AnimatedNumber value={cur.delivered} delay={0}   formatter={n => Math.round(n).toLocaleString('nl-NL')} />,
      change: pctChange(cur.delivered, prev?.delivered),
      icon: Mail,
    },
    {
      label: t('email.stat.openRate'),
      tooltipKey: 'tooltip.openRate',
      value: <AnimatedNumber value={cur.open_rate} delay={100} formatter={n => `${n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`} />,
      change: prev ? pctChange(cur.open_rate, prev.open_rate) : null,
      icon: CheckCircle,
    },
    {
      label: t('email.stat.clickRate'),
      tooltipKey: 'tooltip.clickRate',
      value: <AnimatedNumber value={cur.click_rate} delay={200} formatter={n => `${n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`} />,
      change: prev ? pctChange(cur.click_rate, prev.click_rate) : null,
      icon: MousePointerClick,
    },
    {
      label: t('email.stat.ctor'),
      tooltipKey: 'tooltip.ctor',
      value: <AnimatedNumber value={cur.ctor} delay={300} formatter={n => `${n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`} />,
      change: prev ? pctChange(cur.ctor, prev.ctor) : null,
      icon: TrendingUp,
    },
  ] : []

  const revenueChart = [...flows]
    .filter(f => (f.revenue ?? 0) > 0)
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    .slice(0, 8)
    .map(f => ({ name: truncateLabel(f.name), revenue: Math.round(f.revenue ?? 0) }))

  const ratesChart = [...flows, ...campaigns]
    .filter(x => x.delivered > 0)
    .sort((a, b) => b.delivered - a.delivered)
    .slice(0, 8)
    .map(x => ({
      name: truncateLabel(x.name),
      open_rate: Math.round(x.open_rate * 10) / 10,
      ctor: Math.round(x.ctor * 10) / 10,
    }))

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBdr}`, borderRadius: 10, color: chart.tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' },
    labelStyle: { color: chart.tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 },
    itemStyle: { color: chart.tooltipText, fontSize: 12 },
  }

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header
          title={t('email.title')}
          description={t('email.desc')}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 page-in">

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-muted-foreground text-sm">
                  {slowLoad
                    ? t('email.loadingSlow')
                    : t('email.loading')}
                </span>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {stats.map((s, i) => (
                    <StatCard
                      key={s.label}
                      label={s.label}
                      tooltipKey={s.tooltipKey}
                      value={s.value}
                      change={s.change !== null ? { value: Math.abs(s.change), isPositive: s.change >= 0 } : undefined}
                      icon={s.icon}
                      delay={i * 100}
                    />
                  ))}
                </div>

                {/* Charts */}
                {(revenueChart.length > 0 || ratesChart.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {revenueChart.length > 0 && (
                      <div className="stat-card">
                        <p className="text-foreground font-bold text-lg mb-1">{t('email.chart.revenue')}</p>
                        <p className="text-muted-foreground text-sm mb-4"><DateRangeLabel start={startDate} end={endDate} /></p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={revenueChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v.toLocaleString('nl-NL')}`} />
                            <Tooltip {...tooltipStyle} formatter={(v: number) => [`€${v.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`, t('email.chart.revenueLabel')]} cursor={{ fill: chart.cursorFill }} />
                            <Bar dataKey="revenue" fill="#FF4D00" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {ratesChart.length > 0 && (
                      <div className="stat-card">
                        <p className="text-foreground font-bold text-lg mb-1">{t('email.chart.openVsCtor')}</p>
                        <p className="text-muted-foreground text-sm mb-4">{t('email.chart.openVsCtorDesc')}</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={ratesChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                            <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${fmt(v)}%`, name === 'open_rate' ? t('email.stat.openRate') : t('email.stat.ctor')]} cursor={{ fill: chart.cursorFill }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                            <Bar dataKey="open_rate" name={t('email.stat.openRate')} fill="#4F7EFF" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="ctor" name={t('email.stat.ctor')} fill="#FBBF24" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* iOS Privacy note */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3 mb-8">
                  <span className="text-amber-400 text-lg mt-0.5">ℹ</span>
                  <div>
                    <p className="text-amber-300 font-semibold text-sm">{t('email.iosNote.title')}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {t('email.iosNote.body')}
                    </p>
                  </div>
                </div>

                {/* Best Flow highlight */}
                {bestFlow && (
                  <div className="stat-card border-l-4 border-l-accent mb-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">{t('email.bestFlow')}</p>
                    <p className="text-foreground font-bold text-lg">{bestFlow.name}</p>
                    <div className="flex gap-6 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('email.stat.openRate')}</p>
                        <p className="text-accent font-bold text-xl">{fmt(bestFlow.open_rate)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('email.stat.ctor')}</p>
                        <p className="text-foreground font-bold text-xl">{fmt(bestFlow.ctor)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('email.stat.delivered')}</p>
                        <p className="text-foreground font-bold text-xl">{bestFlow.delivered.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flows list */}
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">{t('email.activeFlows')}</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      <DateRangeLabel start={startDate} end={endDate} />
                    </p>
                  </div>

                  {flows.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('email.noFlows')}</p>
                  ) : (
                    <div className="space-y-4">
                      {flows.map((flow) => (
                        <div key={flow.id} className="stat-card">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-foreground font-semibold">{flow.name}</h3>
                              <p className="text-muted-foreground text-sm mt-1">{flow.delivered} {t('email.delivered')} · {flow.recipients} {t('email.recipients')}</p>
                            </div>
                            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full border bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              {t('email.badge.live')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">{t('email.table.opens')}</p>
                              <p className="text-lg font-bold text-foreground mt-1">{flow.opens}</p>
                              <p className="text-muted-foreground text-xs mt-1">{fmt(flow.open_rate)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">{t('email.table.clicks')}</p>
                              <p className="text-lg font-bold text-foreground mt-1">{flow.clicks}</p>
                              <p className="text-muted-foreground text-xs mt-1">{fmt(flow.click_rate)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">{t('email.stat.ctor')}</p>
                              <p className="text-lg font-bold text-foreground mt-1">{fmt(flow.ctor)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">{t('email.table.unsubs')}</p>
                              <p className="text-lg font-bold text-foreground mt-1">{flow.unsubscribes}</p>
                              <p className="text-muted-foreground text-xs mt-1">{fmt(flow.unsub_rate)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <AudiencesSection />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
