'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { Users, TrendingUp, Eye, Loader2 } from 'lucide-react'
import { DateRangeLabel } from '@/components/DateRangeLabel'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
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

export default function AnalyticsPage() {
  const { startDate, endDate } = useDateRange()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const chartGrid    = isDark ? '#2E3350' : '#E5E7EB'
  const chartTick    = isDark ? '#8B92A9' : '#9CA3AF'
  const tooltipBg    = isDark ? '#21253A' : '#FFFFFF'
  const tooltipBdr   = isDark ? '#2E3350' : '#E2E6F0'
  const tooltipText  = isDark ? '#F0F2FF' : '#111827'
  const [summary, setSummary] = useState<any>(null)
  const [prevSummary, setPrevSummary] = useState<any>(null)
  const [pages, setPages] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const { ps, pe } = getPrevRange(startDate, endDate)
        const [sumRes, prevRes, pagesRes, sourcesRes] = await Promise.all([
          apiFetch(`/api/analytics/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/analytics/summary?start=${ps}&end=${pe}`),
          apiFetch(`/api/analytics/pages?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/analytics/sources?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${sumRes.status}`)
        }
        const [s, sp, p, src] = await Promise.all([
          sumRes.json(),
          prevRes.ok ? prevRes.json() : null,
          pagesRes.ok ? pagesRes.json() : [],
          sourcesRes.ok ? sourcesRes.json() : [],
        ])
        setSummary(s)
        setPrevSummary(sp)
        setPages(p)
        setSources(src)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [startDate, endDate])

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title="Analytics" description="Google Analytics 4 — website traffic & behaviour" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 page-in">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Loading Analytics…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                <p className="font-semibold mb-1">Analytics error</p>
                <p>{error}</p>
                {error.includes('GOOGLE_GA4_REFRESH_TOKEN') && (
                  <p className="mt-2 text-muted-foreground text-xs">
                    Run in the backend folder: <code className="text-accent">node scripts/ga4-oauth.js</code>, then restart the backend.
                  </p>
                )}
              </div>
            )}

            {!loading && !error && summary && (
              <>
                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    label="Active Users"
                    value={summary.users >= 1000 ? `${fmt(summary.users / 1000, 1)}K` : fmt(summary.users)}
                    change={pctChg(summary.users, prevSummary?.users) != null ? { value: Math.abs(pctChg(summary.users, prevSummary?.users)!), isPositive: pctChg(summary.users, prevSummary?.users)! >= 0 } : undefined}
                    icon={Users}
                  />
                  <StatCard
                    label="Sessions"
                    value={summary.sessions >= 1000 ? `${fmt(summary.sessions / 1000, 1)}K` : fmt(summary.sessions)}
                    change={pctChg(summary.sessions, prevSummary?.sessions) != null ? { value: Math.abs(pctChg(summary.sessions, prevSummary?.sessions)!), isPositive: pctChg(summary.sessions, prevSummary?.sessions)! >= 0 } : undefined}
                    icon={TrendingUp}
                  />
                  <StatCard
                    label="Pageviews"
                    value={summary.pageviews >= 1000 ? `${fmt(summary.pageviews / 1000, 1)}K` : fmt(summary.pageviews)}
                    change={pctChg(summary.pageviews, prevSummary?.pageviews) != null ? { value: Math.abs(pctChg(summary.pageviews, prevSummary?.pageviews)!), isPositive: pctChg(summary.pageviews, prevSummary?.pageviews)! >= 0 } : undefined}
                    icon={Eye}
                  />
                  <StatCard
                    label="New Users"
                    value={fmt(summary.new_users)}
                    change={pctChg(summary.new_users, prevSummary?.new_users) != null ? { value: Math.abs(pctChg(summary.new_users, prevSummary?.new_users)!), isPositive: pctChg(summary.new_users, prevSummary?.new_users)! >= 0 } : undefined}
                    icon={Users}
                  />
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="stat-card flex items-center justify-between py-4">
                    <p className="text-muted-foreground text-sm font-medium">Bounce Rate</p>
                    <p className="text-2xl font-bold text-accent">{fmt(summary.bounce_rate, 1)}%</p>
                  </div>
                  <div className="stat-card flex items-center justify-between py-4">
                    <p className="text-muted-foreground text-sm font-medium">Avg. Session Duration</p>
                    <p className="text-2xl font-bold text-accent">{fmtDuration(summary.avg_session)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Traffic sources chart */}
                  <div>
                    <div className="mb-4">
                      <p className="text-foreground font-bold text-lg">Traffic Sources</p>
                      <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /></p>
                    </div>
                    <div className="stat-card">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={sources}
                          layout="vertical"
                          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                          <XAxis type="number" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                          <YAxis type="category" dataKey="source" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                          <Tooltip
                            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBdr}`, borderRadius: 8 }}
                            labelStyle={{ color: tooltipText, fontSize: 12 }}
                            itemStyle={{ color: '#FF4D00', fontSize: 12 }}
                            formatter={(v: number) => [fmt(v), 'Sessions']}
                          />
                          <Bar dataKey="sessions" fill="#FF4D00" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top pages */}
                  <div>
                    <div className="mb-4">
                      <p className="text-foreground font-bold text-lg">Top Pages</p>
                      <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /></p>
                    </div>
                    <div className="stat-card p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Page</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Views</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Users</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Bounce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pages.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-muted-foreground text-sm py-8">No data for this period.</td></tr>
                          ) : pages.map((p, i) => (
                            <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-foreground text-xs font-medium truncate max-w-[180px]">{p.page}</td>
                              <td className="px-4 py-3 text-right text-foreground font-semibold">{fmt(p.pageviews)}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{fmt(p.users)}</td>
                              <td className="px-4 py-3 text-right text-accent font-semibold">{fmt(p.bounce_rate, 1)}%</td>
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
