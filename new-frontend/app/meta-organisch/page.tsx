'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import {
  Users, Eye, Share2, Bookmark, TrendingUp, UserPlus, Camera, Loader2, Heart, MessageCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  IMAGE:          { label: 'Photo',    color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  VIDEO:          { label: 'Video',    color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  CAROUSEL_ALBUM: { label: 'Carousel', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  REELS:          { label: 'Reel',     color: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30' },
}

// Group posts by ISO week label (W1, W2, …) relative to start of period
function toWeeklyChart(posts: any[], startDate: string) {
  const periodStart = new Date(startDate)
  const weeks: Record<string, { week: string; shares: number; saved: number; comments: number }> = {}

  for (const post of posts) {
    const diff = Math.floor(
      (new Date(post.timestamp).getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    const label = `W${diff + 1}`
    if (!weeks[label]) weeks[label] = { week: label, shares: 0, saved: 0, comments: 0 }
    weeks[label].shares   += post.shares ?? 0
    weeks[label].saved    += post.saved ?? 0
    weeks[label].comments += post.comments ?? 0
  }

  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
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

  // Best post = highest reach (fallback: most likes+comments)
  const topPost = posts.length > 0
    ? posts.reduce((best, p) =>
        (p.reach || (p.likes + p.comments)) > (best.reach || (best.likes + best.comments)) ? p : best,
      posts[0])
    : null

  // Totals from posts (for when account-level metrics return 0)
  const totalShares   = posts.reduce((s, p) => s + (p.shares ?? 0), 0)
  const totalSaved    = posts.reduce((s, p) => s + (p.saved ?? 0), 0)
  const totalLikes    = posts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0)

  const effectiveShares = summary?.shares > 0 ? summary.shares : totalShares
  const effectiveSaved  = summary?.saved  > 0 ? summary.saved  : totalSaved

  const reach = summary?.reach ?? 0
  const engagementRate = reach > 0
    ? ((totalLikes + totalComments + effectiveShares + effectiveSaved) / reach) * 100
    : 0

  const weeklyChart = toWeeklyChart(posts, startDate)

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
                <span className="ml-3 text-muted-foreground">Loading Instagram…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                <p className="font-semibold mb-1">Instagram API error</p>
                <p>{error}</p>
                {error.includes('Business Account') && (
                  <p className="mt-2 text-muted-foreground text-xs">
                    Go to Meta Business Manager → Instagram Accounts → make sure the Instagram account is linked to the Facebook Page.
                  </p>
                )}
              </div>
            )}

            {!loading && !error && summary && (
              <>
                {/* Account header */}
                <div className="stat-card mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-bold text-lg">@{summary.username || summary.name}</p>
                    <p className="text-muted-foreground text-sm">{fmt(summary.followers)} followers · {fmt(summary.media_count)} posts</p>
                  </div>
                </div>

                {/* KPI row 1: volume metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    label="Posts"
                    value={String(posts.length)}
                    icon={Camera}
                  />
                  <StatCard
                    label="Reach"
                    value={reach >= 1000 ? `${fmt(reach / 1000, 1)}K` : fmt(reach)}
                    icon={Eye}
                  />
                  <StatCard
                    label="Shares"
                    value={fmt(effectiveShares)}
                    icon={Share2}
                  />
                  <StatCard
                    label="Opgeslagen"
                    value={fmt(effectiveSaved)}
                    icon={Bookmark}
                  />
                </div>

                {/* KPI row 2: engagement metrics */}
                <div className={`grid gap-6 mb-8 ${summary.profile_views > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <StatCard
                    label="Engagement Rate"
                    value={`${fmt(engagementRate, 1)}%`}
                    icon={TrendingUp}
                  />
                  <StatCard
                    label="Nieuwe Volgers"
                    value={summary.new_followers > 0 ? `+${fmt(summary.new_followers)}` : fmt(summary.new_followers)}
                    icon={UserPlus}
                  />
                  {summary.profile_views > 0 && (
                    <StatCard
                      label="Profielbezoeken"
                      value={summary.profile_views >= 1000 ? `${fmt(summary.profile_views / 1000, 1)}K` : fmt(summary.profile_views)}
                      icon={Users}
                    />
                  )}
                </div>

                {/* Best post */}
                {topPost && (
                  <div className="stat-card border-l-4 border-l-pink-500 mb-8">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Beste Post Deze Periode</p>
                    <p className="text-foreground font-medium text-sm mb-4">{topPost.caption}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {topPost.reach > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Bereik</p>
                          <p className="text-foreground font-bold text-lg">{topPost.reach >= 1000 ? `${fmt(topPost.reach / 1000, 1)}K` : fmt(topPost.reach)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Likes</p>
                        <p className="text-foreground font-bold text-lg flex items-center gap-1">
                          <Heart className="w-4 h-4 text-pink-400" />{fmt(topPost.likes)}
                        </p>
                      </div>
                      {topPost.shares > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Shares</p>
                          <p className="text-foreground font-bold text-lg">{fmt(topPost.shares)}</p>
                        </div>
                      )}
                      {topPost.saved > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Opgeslagen</p>
                          <p className="text-foreground font-bold text-lg">{fmt(topPost.saved)}</p>
                        </div>
                      )}
                      {topPost.engagement_rate > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Engagement</p>
                          <p className="text-accent font-bold text-lg">{fmt(topPost.engagement_rate, 1)}%</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${(TYPE_BADGE[topPost.type] ?? TYPE_BADGE.IMAGE).color}`}>
                        {(TYPE_BADGE[topPost.type] ?? TYPE_BADGE.IMAGE).label}
                      </span>
                      <span className="text-muted-foreground text-xs">{formatDate(topPost.timestamp)}</span>
                    </div>
                  </div>
                )}

                {/* Interactions by type chart */}
                {weeklyChart.length > 0 && (
                  <div className="stat-card mb-8">
                    <p className="text-sm font-semibold text-foreground mb-6">Interacties per Type</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weeklyChart} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="shares"   name="Shares"      stackId="a" fill="#FF4D00" radius={[0,0,0,0]} />
                        <Bar dataKey="saved"    name="Opgeslagen"  stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                        <Bar dataKey="comments" name="Reacties"    stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Posts table */}
                <div>
                  <p className="text-foreground font-bold text-lg mb-1">Posts in Periode</p>
                  <p className="text-muted-foreground text-sm mb-4">{startDate} → {endDate} · {posts.length} post{posts.length !== 1 ? 's' : ''}</p>

                  {posts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Geen posts gepubliceerd in deze periode.</p>
                  ) : (
                    <div className="stat-card p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">Caption</th>
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Type</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Likes</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Comments</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Shares</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Saved</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Reach</th>
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
                                <td className="px-4 py-3 text-right text-foreground font-semibold">{fmt(post.likes)}</td>
                                <td className="px-4 py-3 text-right text-foreground">{fmt(post.comments)}</td>
                                <td className="px-4 py-3 text-right text-foreground">{fmt(post.shares)}</td>
                                <td className="px-4 py-3 text-right text-foreground">{fmt(post.saved)}</td>
                                <td className="px-4 py-3 text-right text-foreground">
                                  {post.reach >= 1000 ? `${fmt(post.reach / 1000, 1)}K` : fmt(post.reach)}
                                </td>
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
