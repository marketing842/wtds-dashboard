'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
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
import { useLanguage } from '@/lib/language-context'
import { MetricLabel } from '@/components/MetricLabel'
import type { ReactNode } from 'react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { DateRangeLabel } from '@/components/DateRangeLabel'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: decimals })
}
function fmtK(n: number) {
  return n >= 1000 ? `${fmt(n / 1000, 1)}K` : fmt(n)
}
function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

const TYPE_BADGE_KEYS: Record<string, string> = {
  IMAGE:          'organisch.badge.photo',
  VIDEO:          'organisch.badge.video',
  CAROUSEL_ALBUM: 'organisch.badge.carousel',
  REELS:          'organisch.badge.reel',
}

const TYPE_BADGE_COLOR: Record<string, string> = {
  IMAGE:          'bg-blue-500/20 text-blue-300 border-blue-500/30',
  VIDEO:          'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CAROUSEL_ALBUM: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  REELS:          'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function toChartData(posts: any[], startDate: string, endDate: string) {
  const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  const start = new Date(startDate)

  const groups = new Map<string, { sortKey: string; label: string; week: string; shares: number; saved: number; comments: number }>()

  for (const post of posts) {
    const d = new Date(post.timestamp)
    let sortKey: string
    let label: string

    if (daysDiff <= 60) {
      const wk = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000))
      sortKey = String(wk).padStart(4, '0')
      label = `W${wk + 1}`
    } else if (daysDiff <= 365) {
      sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      label = d.toLocaleDateString('nl-NL', { month: 'short' })
    } else {
      sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      label = d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' })
    }

    if (!groups.has(sortKey)) groups.set(sortKey, { sortKey, label, week: label, shares: 0, saved: 0, comments: 0 })
    const g = groups.get(sortKey)!
    g.shares   += post.shares   ?? 0
    g.saved    += post.saved    ?? 0
    g.comments += post.comments ?? 0
  }

  return [...groups.values()].sort((a, b) => a.sortKey < b.sortKey ? -1 : 1)
}

function postScore(p: any) {
  return (p.reach || 0) + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saved ?? 0)
}

function KpiCard({ label, value, sub, icon: Icon, accent = false, delay = 0, tooltipKey }: {
  label: string; value: ReactNode; sub?: ReactNode; icon?: any; accent?: boolean; delay?: number; tooltipKey?: string
}) {
  return (
    <div className="stat-card flex flex-col gap-2 fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          <MetricLabel label={label} tooltipKey={tooltipKey} />
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-transform duration-300 hover:scale-110">
            <Icon className="w-4 h-4 text-accent" />
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold number-reveal ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  )
}

export default function MetaOrganischPage() {
  const { startDate, endDate } = useDateRange()
  const { resolvedTheme } = useTheme()
  const { t } = useLanguage()
  const isDark      = resolvedTheme !== 'light'
  const tooltipBg   = isDark ? '#1A1D27' : '#FFFFFF'
  const tooltipBdr  = isDark ? '#2E3350' : '#E2E6F0'
  const tooltipText = isDark ? '#F0F2FF' : '#111827'
  const chartTick   = isDark ? '#8B92A9' : '#9CA3AF'

  const [summary, setSummary] = useState<any>(null)
  const [facebook, setFacebook] = useState<any>(null)
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
        const [sumRes, postsRes, extRes] = await Promise.all([
          apiFetch(`/api/instagram/summary?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/instagram/posts?start=${startDate}&end=${endDate}`),
          apiFetch(`/api/instagram/extended?start=${startDate}&end=${endDate}`),
        ])
        if (!sumRes.ok) {
          const body = await sumRes.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${sumRes.status}`)
        }
        const [s, p, ext] = await Promise.all([
          sumRes.json(),
          postsRes.ok ? postsRes.json() : [],
          extRes.ok ? extRes.json() : null,
        ])
        if (!active) return
        setSummary(ext?.instagram ?? s)
        setFacebook(ext?.facebook ?? { available: false })
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

  const topPosts = [...posts]
    .sort((a, b) => postScore(b) - postScore(a))
    .slice(0, 3)

  const totalLikes    = posts.reduce((s, p) => s + (p.likes    ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const totalShares   = posts.reduce((s, p) => s + (p.shares   ?? 0), 0)
  const totalSaved    = posts.reduce((s, p) => s + (p.saved    ?? 0), 0)

  const totalPostReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const reach = (summary?.reach ?? 0) > 0 ? summary.reach : totalPostReach
  const engagementRate = reach > 0
    ? ((totalLikes + totalComments + totalShares + totalSaved) / reach) * 100
    : 0

  const chartData = toChartData(posts, startDate, endDate)
  const chartHasData = chartData.some(w => w.shares + w.saved + w.comments > 0)

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header title={t('organisch.title')} description={t('organisch.desc')} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 page-in min-w-0">

            {loading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="ml-3 text-muted-foreground">{t('organisch.loading')}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm mb-8">
                <p className="font-semibold mb-1">{t('organisch.apiError')}</p>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && summary && (
              <>
                {/* Account header */}
                <div className="stat-card mb-8 flex items-center gap-4 fade-in-up">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0 spin-on-hover cursor-pointer"
                    style={{ boxShadow: '0 4px 20px rgba(236,72,153,0.4)', transition: 'box-shadow 300ms ease' }}>
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>@{summary.username || summary.name}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <AnimatedNumber value={summary.followers} delay={200} formatter={n => n >= 1000 ? `${(n/1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}K` : Math.round(n).toLocaleString('nl-NL')} />
                      {' '}{t('organisch.followers')} · {fmt(summary.media_count)} {t('organisch.totalPostsSuffix')}
                    </p>
                  </div>
                  {summary.new_followers !== 0 && (
                    <div className="text-right badge-pop">
                      <p className={`text-2xl font-bold ${summary.new_followers >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {summary.new_followers > 0 ? '+' : ''}
                        <AnimatedNumber value={Math.abs(summary.new_followers)} delay={400} formatter={n => Math.round(n).toLocaleString('nl-NL')} />
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('organisch.newFollowers')}</p>
                    </div>
                  )}
                </div>

                {/* KPIs — uniform 3-column grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <KpiCard
                    label={t('organisch.postsThisPeriod')}
                    value={<AnimatedNumber value={posts.length} delay={0} formatter={n => String(Math.round(n))} />}
                    sub={<DateRangeLabel start={startDate} end={endDate} />}
                    icon={Camera} delay={0}
                  />
                  <KpiCard
                    label={t('organisch.stat.reach')}
                    tooltipKey="tooltip.reach"
                    value={<AnimatedNumber value={reach} delay={100} formatter={n => n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}K` : Math.round(n).toLocaleString('nl-NL')} />}
                    sub={t('organisch.uniqueReach')}
                    icon={Eye} accent delay={100}
                  />
                  <KpiCard
                    label={t('organisch.stat.engagement')}
                    tooltipKey="tooltip.engagement"
                    value={<AnimatedNumber value={engagementRate} delay={200} formatter={n => `${n.toLocaleString('nl-NL', { maximumFractionDigits: 1 })}%`} />}
                    sub={t('organisch.engagementSub')}
                    icon={TrendingUp} accent delay={200}
                  />
                  <KpiCard
                    label={t('organisch.stat.shares')}
                    tooltipKey="tooltip.shares"
                    value={<AnimatedNumber value={totalShares} delay={250} formatter={n => Math.round(n).toLocaleString('nl-NL')} />}
                    icon={Share2} accent delay={250}
                  />
                  <KpiCard
                    label={t('organisch.stat.likes')}
                    value={<AnimatedNumber value={totalLikes} delay={300} formatter={n => Math.round(n).toLocaleString('nl-NL')} />}
                    icon={Heart} delay={300}
                  />
                  <KpiCard
                    label={t('organisch.stat.comments')}
                    value={<AnimatedNumber value={totalComments} delay={400} formatter={n => Math.round(n).toLocaleString('nl-NL')} />}
                    icon={MessageCircle} delay={400}
                  />
                  {totalSaved > 0 && (
                    <KpiCard
                      label={t('organisch.stat.saved')}
                      value={<AnimatedNumber value={totalSaved} delay={500} formatter={n => Math.round(n).toLocaleString('nl-NL')} />}
                      icon={Bookmark} delay={500}
                    />
                  )}
                  {summary.profile_views > 0 && (
                    <KpiCard
                      label={t('organisch.stat.profileViews')}
                      value={<AnimatedNumber value={summary.profile_views} delay={500} formatter={n => n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })}K` : Math.round(n).toLocaleString('nl-NL')} />}
                      icon={Users} delay={500}
                    />
                  )}
                </div>

                {(summary?.reach_split_available || summary?.reach_split_available === false) && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.reachSplit')}</p>
                    {summary.reach_split_available ? (
                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('organisch.reachFollowers')}</p>
                          <p className="text-2xl font-bold text-foreground">{fmtK(summary.followers_reach ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t('organisch.reachNonFollowers')}</p>
                          <p className="text-2xl font-bold text-accent">{fmtK(summary.non_followers_reach ?? 0)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">{t('organisch.reachSplitUnavailable')}</p>
                    )}
                  </div>
                )}

                {facebook === null ? null : facebook.available ? (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.facebook')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{facebook.name} · {t('organisch.facebookDesc')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div><p className="text-xs text-muted-foreground">{t('organisch.facebookFans')}</p><p className="text-xl font-bold">{fmt(facebook.fans)}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('organisch.facebookImpressions')}</p><p className="text-xl font-bold">{fmtK(facebook.impressions)}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('organisch.facebookEngaged')}</p><p className="text-xl font-bold">{fmtK(facebook.engaged_users)}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('organisch.stat.posts')}</p><p className="text-xl font-bold">{facebook.posts?.length ?? 0}</p></div>
                    </div>
                    {(facebook.posts ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('organisch.facebookPosts')}</p>
                        <div className="space-y-3">
                          {facebook.posts.slice(0, 5).map((post: any) => (
                            <div key={post.id} className="rounded-lg p-3" style={{ background: 'var(--border)' }}>
                              <p className="text-sm text-foreground mb-2 line-clamp-2">{post.message}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{t('organisch.stat.likes')}: {post.likes}</span>
                                <span>{t('organisch.stat.comments')}: {post.comments}</span>
                                <span>{t('organisch.stat.shares')}: {post.shares}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-8">{t('organisch.noFacebook')}</p>
                )}

                {/* Best posts + Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {topPosts.length > 0 ? (
                    <div className="stat-card border-l-4 border-l-pink-500 flex flex-col">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
                        {t('organisch.bestPosts')}
                      </p>
                      <div className="space-y-4 flex-1">
                        {topPosts.map((post, idx) => {
                          const typeKey = post.type ?? 'IMAGE'
                          const badgeColor = TYPE_BADGE_COLOR[typeKey] ?? TYPE_BADGE_COLOR.IMAGE
                          const badgeLabel = t(TYPE_BADGE_KEYS[typeKey] ?? TYPE_BADGE_KEYS.IMAGE)
                          return (
                            <div key={post.id ?? idx} className="bg-[var(--border)]/20 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-accent font-black text-lg">#{idx + 1}</span>
                                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {badgeLabel}
                                </span>
                              </div>
                              <p className="text-foreground font-medium text-sm mb-3 leading-relaxed line-clamp-2">{post.caption}</p>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                {post.reach > 0 && (
                                  <div><span className="text-muted-foreground">{t('organisch.stat.reach')}</span><p className="font-bold text-foreground">{fmtK(post.reach)}</p></div>
                                )}
                                <div><span className="text-muted-foreground">{t('organisch.stat.likes')}</span><p className="font-bold text-foreground">{fmt(post.likes)}</p></div>
                                <div><span className="text-muted-foreground">{t('organisch.stat.shares')}</span><p className="font-bold text-foreground">{fmt(post.shares ?? 0)}</p></div>
                              </div>
                              <p className="text-muted-foreground text-xs mt-2">{formatDate(post.timestamp)}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : <div />}

                  {/* Interactions chart */}
                  {chartHasData ? (
                    <div className="stat-card fade-in-up" style={{ animationDelay: '200ms' }}>
                      <p className="text-sm font-bold mb-6" style={{ color: 'var(--text-primary)' }}>{t('organisch.interactions')}</p>
                      <div className="[&_.recharts-surface]:bg-transparent">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barSize={56}>
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{
                                background: tooltipBg,
                                border: `1px solid ${tooltipBdr}`,
                                borderRadius: 10,
                                fontSize: 12,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                padding: '10px 14px',
                              }}
                              labelStyle={{ color: tooltipText, fontWeight: 700, marginBottom: 6, fontSize: 13 }}
                              itemStyle={{ color: tooltipText, padding: '2px 0' }}
                              cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 12, paddingTop: 10, color: chartTick }}
                              iconType="circle" iconSize={8}
                            />
                            {totalComments > 0 && <Bar dataKey="comments" name={t('organisch.stat.comments')} stackId="a" fill="#3b82f6" radius={[0,0,0,0]} animationDuration={1200} animationBegin={100} />}
                            {totalSaved  > 0 && <Bar dataKey="saved"    name={t('organisch.stat.saved')}    stackId="a" fill="#f59e0b" radius={[0,0,0,0]} animationDuration={1200} animationBegin={200} />}
                            {totalShares > 0 && <Bar dataKey="shares"   name={t('organisch.stat.shares')}   stackId="a" fill="#FF4D00" radius={[4,4,0,0]} animationDuration={1200} animationBegin={300} />}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : <div />}
                </div>

                {/* Posts table */}
                <div>
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-xl">{t('organisch.recentPosts')}</p>
                    <p className="text-muted-foreground text-sm mt-1"><DateRangeLabel start={startDate} end={endDate} /> · {posts.length} {t('common.posts')}</p>
                  </div>

                  {posts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('organisch.noData')}</p>
                  ) : (
                    <div className="stat-card p-0 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm table-fixed min-w-[720px] lg:min-w-0">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="text-left text-muted-foreground text-xs font-medium px-5 py-3">{t('common.caption')}</th>
                              <th className="text-left text-muted-foreground text-xs font-medium px-4 py-3">{t('common.type')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.reach')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.likes')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.comments')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.stat.shares')}</th>
                              {totalSaved  > 0 && <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.stat.saved')}</th>}
                              <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3 whitespace-nowrap">{t('organisch.table.date')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {posts.map((post, i) => {
                              const typeKey = post.type ?? 'IMAGE'
                              const badgeColor = TYPE_BADGE_COLOR[typeKey] ?? TYPE_BADGE_COLOR.IMAGE
                              const badgeLabel = t(TYPE_BADGE_KEYS[typeKey] ?? TYPE_BADGE_KEYS.IMAGE)
                              return (
                                <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors fade-in-up"
                                  style={{ animationDelay: `${i * 40}ms` }}>
                                  <td className="px-5 py-3 text-foreground truncate">{post.caption}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeColor}`}>
                                      {badgeLabel}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{fmtK(post.reach ?? 0)}</td>
                                  <td className="px-4 py-3 text-right text-foreground font-semibold whitespace-nowrap">{fmt(post.likes)}</td>
                                  <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.comments)}</td>
                                  <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.shares ?? 0)}</td>
                                  {totalSaved  > 0 && <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.saved)}</td>}
                                  <td className="px-5 py-3 text-right text-muted-foreground whitespace-nowrap">{formatDate(post.timestamp)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
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
