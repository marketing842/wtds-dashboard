'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { useDateRange } from '@/lib/date-range-context'
import {
  Users, Eye, Share2, Bookmark, TrendingUp, Camera, Loader2, Heart, MessageCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}
function fmtK(n: number) {
  return n >= 1000 ? `${fmt(n / 1000, 1)}K` : fmt(n)
}
function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  IMAGE:          { label: 'Photo',    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  VIDEO:          { label: 'Video',    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  CAROUSEL_ALBUM: { label: 'Carousel', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  REELS:          { label: 'Reel',     color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
}

function toWeeklyChart(posts: any[], startDate: string) {
  const periodStart = new Date(startDate)
  const weeks: Record<string, { week: string; shares: number; saved: number; comments: number }> = {}
  for (const post of posts) {
    const diff = Math.floor(
      (new Date(post.timestamp).getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    const label = `W${diff + 1}`
    if (!weeks[label]) weeks[label] = { week: label, shares: 0, saved: 0, comments: 0 }
    weeks[label].shares   += post.shares   ?? 0
    weeks[label].saved    += post.saved    ?? 0
    weeks[label].comments += post.comments ?? 0
  }
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
}

function KpiCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string; sub?: string; icon?: any; accent?: boolean
}) {
  return (
    <div className="stat-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-accent" />
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  )
}

export default function MetaOrganischPage() {
  const { startDate, endDate } = useDateRange()
  const [summary, setSummary] = useState<any>(null)
  const [posts, setPosts]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      await new Promise(r => setTimeout(r, 600))
      if (!active) return
      try {
        const [sumRes, postsRes] = await Promise.all([
          apiFetch(`/api/instagram/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/instagram/posts?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${sumRes.status}`)
        }
        const [s, p] = await Promise.all([
          sumRes.json(),
          postsRes.ok ? postsRes.json() : [],
        ])
        if (!active) return
        setSummary(s)
        setPosts(p)
      } catch (e: any) {
        if (!active) return
        setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [startDate, endDate])

  const topPost = posts.length > 0
    ? posts.reduce((best, p) =>
        ((p.reach || 0) + p.likes + p.comments) > ((best.reach || 0) + best.likes + best.comments) ? p : best,
      posts[0])
    : null

  const totalLikes    = posts.reduce((s, p) => s + (p.likes    ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const totalShares   = posts.reduce((s, p) => s + (p.shares   ?? 0), 0)
  const totalSaved    = posts.reduce((s, p) => s + (p.saved    ?? 0), 0)

  const reach = summary?.reach ?? 0
  const engagementRate = reach > 0
    ? ((totalLikes + totalComments + totalShares + totalSaved) / reach) * 100
    : 0

  const weeklyChart = toWeeklyChart(posts, startDate)
  const chartHasData = weeklyChart.some(w => w.shares + w.saved + w.comments > 0)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title="Meta Organisch" description="Instagram organic reach & engagement" />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">Instagram data laden…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                <p className="font-semibold mb-1">Instagram API error</p>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && summary && (
              <>
                {/* Account header */}
                <div className="stat-card mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-bold text-lg">@{summary.username || summary.name}</p>
                    <p className="text-muted-foreground text-sm">{fmtK(summary.followers)} followers · {fmt(summary.media_count)} posts totaal</p>
                  </div>
                  {summary.new_followers !== 0 && (
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${summary.new_followers >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {summary.new_followers > 0 ? '+' : ''}{fmt(summary.new_followers)}
                      </p>
                      <p className="text-muted-foreground text-xs">nieuwe volgers</p>
                    </div>
                  )}
                </div>

                {/* KPIs — uniform 3-column grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <KpiCard
                    label="Posts Deze Periode"
                    value={String(posts.length)}
                    sub={`${startDate} → ${endDate}`}
                    icon={Camera}
                  />
                  <KpiCard
                    label="Bereik"
                    value={fmtK(reach)}
                    sub="unieke accounts bereikt"
                    icon={Eye}
                    accent
                  />
                  <KpiCard
                    label="Engagement Rate"
                    value={`${fmt(engagementRate, 1)}%`}
                    sub="likes + comments + shares + saves"
                    icon={TrendingUp}
                    accent
                  />
                  <KpiCard
                    label="Likes"
                    value={fmt(totalLikes)}
                    icon={Heart}
                  />
                  <KpiCard
                    label="Reacties"
                    value={fmt(totalComments)}
                    icon={MessageCircle}
                  />
                  {totalShares > 0 ? (
                    <KpiCard label="Shares" value={fmt(totalShares)} icon={Share2} />
                  ) : totalSaved > 0 ? (
                    <KpiCard label="Opgeslagen" value={fmt(totalSaved)} icon={Bookmark} />
                  ) : summary.profile_views > 0 ? (
                    <KpiCard label="Profielbezoeken" value={fmtK(summary.profile_views)} icon={Users} />
                  ) : (
                    <KpiCard label="Opgeslagen" value="—" sub="niet beschikbaar via API" icon={Bookmark} />
                  )}
                </div>

                {/* Best post */}
                {topPost && (
                  <div className="stat-card border-l-4 border-l-pink-500 mb-8">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                      Beste Post Deze Periode
                    </p>
                    <p className="text-foreground font-medium text-sm mb-5 leading-relaxed">{topPost.caption}</p>
                    <div className="flex flex-wrap gap-6 mb-4">
                      {topPost.reach > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Bereik</p>
                          <p className="text-foreground font-bold text-xl">{fmtK(topPost.reach)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Likes</p>
                        <p className="text-foreground font-bold text-xl">{fmt(topPost.likes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Reacties</p>
                        <p className="text-foreground font-bold text-xl">{fmt(topPost.comments)}</p>
                      </div>
                      {topPost.shares > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Shares</p>
                          <p className="text-foreground font-bold text-xl">{fmt(topPost.shares)}</p>
                        </div>
                      )}
                      {topPost.saved > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Opgeslagen</p>
                          <p className="text-foreground font-bold text-xl">{fmt(topPost.saved)}</p>
                        </div>
                      )}
                      {topPost.engagement_rate > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">Engagement</p>
                          <p className="text-accent font-bold text-xl">{fmt(topPost.engagement_rate, 1)}%</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${(TYPE_BADGE[topPost.type] ?? TYPE_BADGE.IMAGE).color}`}>
                        {(TYPE_BADGE[topPost.type] ?? TYPE_BADGE.IMAGE).label}
                      </span>
                      <span className="text-muted-foreground text-xs">{formatDate(topPost.timestamp)}</span>
                    </div>
                  </div>
                )}

                {/* Interactions chart — only render when there's real data */}
                {chartHasData && (
                  <div className="stat-card mb-8">
                    <p className="text-sm font-semibold text-foreground mb-6">Interacties per Type</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weeklyChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} style={{ background: 'transparent' }}>
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        {totalComments > 0 && <Bar dataKey="comments" name="Reacties"   stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />}
                        {totalSaved  > 0 && <Bar dataKey="saved"    name="Opgeslagen" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />}
                        {totalShares > 0 && <Bar dataKey="shares"   name="Shares"     stackId="a" fill="#FF4D00" radius={[4,4,0,0]} />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Posts table */}
                <div>
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-xl">Posts in Periode</p>
                    <p className="text-muted-foreground text-sm mt-1">{startDate} → {endDate} · {posts.length} post{posts.length !== 1 ? 's' : ''}</p>
                  </div>

                  {posts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Geen posts gepubliceerd in deze periode.</p>
                  ) : (
                    <div className="stat-card p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">Caption</th>
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Type</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Bereik</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Likes</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Reacties</th>
                            {totalShares > 0 && <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Shares</th>}
                            {totalSaved  > 0 && <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Opgesl.</th>}
                            <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3">Datum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posts.map((post, i) => {
                            const badge = TYPE_BADGE[post.type] ?? TYPE_BADGE.IMAGE
                            return (
                              <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors">
                                <td className="px-5 py-3 text-foreground max-w-xs truncate">{post.caption}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground">{fmtK(post.reach ?? 0)}</td>
                                <td className="px-4 py-3 text-right text-foreground font-semibold">{fmt(post.likes)}</td>
                                <td className="px-4 py-3 text-right text-foreground">{fmt(post.comments)}</td>
                                {totalShares > 0 && <td className="px-4 py-3 text-right text-foreground">{fmt(post.shares)}</td>}
                                {totalSaved  > 0 && <td className="px-4 py-3 text-right text-foreground">{fmt(post.saved)}</td>}
                                <td className="px-5 py-3 text-right text-muted-foreground">{formatDate(post.timestamp)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
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
