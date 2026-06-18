'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { useDateRange } from '@/lib/date-range-context'
import { Users, Eye, MousePointerClick, Camera, Loader2, Heart, MessageCircle } from 'lucide-react'

import { apiFetch } from '@/lib/api'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  IMAGE: { label: 'Photo', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  VIDEO: { label: 'Video', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  CAROUSEL_ALBUM: { label: 'Carousel', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  REELS: { label: 'Reel', color: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30' },
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

export default function MetaOrganischPage() {
  const { startDate, endDate } = useDateRange()
  const [summary, setSummary] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
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
        setSummary(s)
        setPosts(p)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [startDate, endDate])

  const topPost = posts.length > 0
    ? posts.reduce((best, p) => (p.likes + p.comments > best.likes + best.comments ? p : best), posts[0])
    : null

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
                    Go to Meta Business Manager → Instagram Accounts → make sure Spotlezz Instagram is added and linked to the Facebook Page.
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

                {/* KPI cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard
                    label="Followers"
                    value={summary.followers >= 1000 ? `${fmt(summary.followers / 1000, 1)}K` : fmt(summary.followers)}
                    icon={Users}
                  />
                  <StatCard
                    label="Reach"
                    value={summary.reach >= 1000 ? `${fmt(summary.reach / 1000, 1)}K` : fmt(summary.reach)}
                    icon={Eye}
                  />
                  <StatCard
                    label="Impressions"
                    value={summary.impressions >= 1000 ? `${fmt(summary.impressions / 1000, 1)}K` : fmt(summary.impressions)}
                    icon={Eye}
                  />
                  <StatCard
                    label="Profile Views"
                    value={fmt(summary.profile_views)}
                    icon={MousePointerClick}
                  />
                </div>

                {/* Best post highlight */}
                {topPost && (
                  <div className="stat-card border-l-4 border-l-pink-500 mb-8">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Best Post This Period</p>
                    <p className="text-foreground font-medium text-sm mb-3">{topPost.caption}</p>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-400" />
                        <span className="text-foreground font-bold">{fmt(topPost.likes)}</span>
                        <span className="text-muted-foreground text-xs">likes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        <span className="text-foreground font-bold">{fmt(topPost.comments)}</span>
                        <span className="text-muted-foreground text-xs">comments</span>
                      </div>
                      <div className="ml-auto">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${(TYPE_BADGE[topPost.type] ?? TYPE_BADGE.IMAGE).color}`}>
                          {(TYPE_BADGE[topPost.type] ?? TYPE_BADGE.IMAGE).label}
                        </span>
                        <span className="text-muted-foreground text-xs ml-3">{formatDate(topPost.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Posts table */}
                <div>
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-lg">Posts in Period</p>
                    <p className="text-muted-foreground text-sm mt-1">{startDate} → {endDate} · {posts.length} post{posts.length !== 1 ? 's' : ''}</p>
                  </div>

                  {posts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No posts published in this period.</p>
                  ) : (
                    <div className="stat-card p-0 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">Caption</th>
                            <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">Type</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Likes</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">Comments</th>
                            <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3">Date</th>
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
