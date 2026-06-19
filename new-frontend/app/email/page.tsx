'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { Mail, MousePointerClick, CheckCircle, TrendingUp, Loader2 } from 'lucide-react'

import { apiFetch } from '@/lib/api'

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
  const [summary, setSummary] = useState<any>(null)
  const [flows, setFlows] = useState<any[]>([])
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
          const [sRes, fRes] = await Promise.all([
            apiFetch(`/api/klaviyo/summary?start=${startDate}&end=${endDate}&compare_start=${compare_start}&compare_end=${compare_end}`),
            apiFetch(`/api/klaviyo/flows?start=${startDate}&end=${endDate}`),
          ])
          if (!active) return

          // Retry transparently on rate-limit or server error
          const retryable =
            (!sRes.ok && (sRes.status === 429 || sRes.status >= 500)) ||
            (!fRes.ok && (fRes.status === 429 || fRes.status >= 500))
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

          const [s, f] = await Promise.all([sRes.json(), fRes.json()])
          if (!active) return
          setSummary(s)
          setFlows(f)
          setLoading(false)
          return // success
        } catch (e: any) {
          if (!active) return
          lastErr = e.message
          if (attempt < MAX_ATTEMPTS - 1) continue
        }
      }
      setError(lastErr || 'Failed to load data')
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
      label: 'Delivered',
      value: cur.delivered.toLocaleString(),
      change: pctChange(cur.delivered, prev?.delivered),
      icon: Mail,
    },
    {
      label: 'Open Rate',
      value: `${fmt(cur.open_rate)}%`,
      change: prev ? pctChange(cur.open_rate, prev.open_rate) : null,
      icon: CheckCircle,
    },
    {
      label: 'Click Rate',
      value: `${fmt(cur.click_rate)}%`,
      change: prev ? pctChange(cur.click_rate, prev.click_rate) : null,
      icon: MousePointerClick,
    },
    {
      label: 'Click-to-Open',
      value: `${fmt(cur.ctor)}%`,
      change: prev ? pctChange(cur.ctor, prev.ctor) : null,
      icon: TrendingUp,
    },
  ] : []

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header
          title="Email / Flows"
          description="Real Klaviyo data for the selected period"
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-muted-foreground text-sm">
                  {slowLoad
                    ? 'Klaviyo is rate-limiting — retrying automatically, please wait…'
                    : 'Loading Klaviyo data…'}
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
                  {stats.map(s => (
                    <StatCard
                      key={s.label}
                      label={s.label}
                      value={s.value}
                      change={s.change !== null ? { value: Math.abs(s.change), isPositive: s.change >= 0 } : undefined}
                      icon={s.icon}
                    />
                  ))}
                </div>

                {/* iOS Privacy note */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3 mb-8">
                  <span className="text-amber-400 text-lg mt-0.5">ℹ</span>
                  <div>
                    <p className="text-amber-300 font-semibold text-sm">iOS Mail Privacy note</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Apple Mail Privacy Protection inflates open rates on iOS devices.
                      CTOR (click-to-open ratio) is a more reliable engagement signal.
                    </p>
                  </div>
                </div>

                {/* Best Flow highlight */}
                {bestFlow && (
                  <div className="stat-card border-l-4 border-l-accent mb-6">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Best Performing Flow</p>
                    <p className="text-foreground font-bold text-lg">{bestFlow.name}</p>
                    <div className="flex gap-6 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Open Rate</p>
                        <p className="text-accent font-bold text-xl">{fmt(bestFlow.open_rate)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTOR</p>
                        <p className="text-foreground font-bold text-xl">{fmt(bestFlow.ctor)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                        <p className="text-foreground font-bold text-xl">{bestFlow.delivered.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flows list */}
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Active Flows</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {startDate} → {endDate}
                    </p>
                  </div>

                  {flows.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No flow data for this period.</p>
                  ) : (
                    <div className="space-y-4">
                      {flows.map((flow) => (
                        <div key={flow.id} className="stat-card">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-foreground font-semibold">{flow.name}</h3>
                              <p className="text-muted-foreground text-sm mt-1">{flow.delivered} delivered · {flow.recipients} recipients</p>
                            </div>
                            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full border bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              Live
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-4 mt-6">
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">Opens</p>
                              <p className="text-lg font-bold text-foreground mt-1">{flow.opens}</p>
                              <p className="text-muted-foreground text-xs mt-1">{fmt(flow.open_rate)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">Clicks</p>
                              <p className="text-lg font-bold text-foreground mt-1">{flow.clicks}</p>
                              <p className="text-muted-foreground text-xs mt-1">{fmt(flow.click_rate)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">CTOR</p>
                              <p className="text-lg font-bold text-foreground mt-1">{fmt(flow.ctor)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs font-medium">Unsubs</p>
                              <p className="text-lg font-bold text-foreground mt-1">{flow.unsubscribes}</p>
                              <p className="text-muted-foreground text-xs mt-1">{fmt(flow.unsub_rate)}%</p>
                            </div>
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
