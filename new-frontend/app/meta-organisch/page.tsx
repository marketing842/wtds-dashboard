'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { MetricKpi } from '@/components/MetricLabel'
import { useDateRange } from '@/lib/date-range-context'
import {
  Users, Eye, Share2, Bookmark, TrendingUp, Camera, Loader2, Heart, MessageCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, CartesianGrid,
} from 'recharts'
import { apiFetch } from '@/lib/api'
import { useLanguage } from '@/lib/language-context'
import { useChartColors, truncateLabel } from '@/lib/chart-theme'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { DateRangeLabel } from '@/components/DateRangeLabel'

const TYPE_BADGE_KEYS: Record<string, string> = {
  IMAGE: 'organisch.badge.photo',
  VIDEO: 'organisch.badge.video',
  CAROUSEL_ALBUM: 'organisch.badge.carousel',
  REELS: 'organisch.badge.reel',
}

const TYPE_BADGE_COLOR: Record<string, string> = {
  IMAGE: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  VIDEO: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  CAROUSEL_ALBUM: 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
  REELS: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
}

const TYPE_CHART_COLORS: Record<string, string> = {
  REELS: '#FF4D00',
  IMAGE: '#4F7EFF',
  CAROUSEL_ALBUM: '#EC4899',
  VIDEO: '#8B5CF6',
}

const ENGAGEMENT_COLORS = ['#FF4D00', '#4F7EFF', '#10B981', '#F59E0B']
const RANK_COLOR = ['text-yellow-400', 'text-muted-foreground', 'text-orange-400']

function toChartData(
  posts: any[],
  startDate: string,
  endDate: string,
  monthLabel: (d: Date, withYear?: boolean) => string,
) {
  const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  const start = new Date(startDate)
  const groups = new Map<string, { sortKey: string; label: string; week: string; likes: number; shares: number; saved: number; comments: number }>()

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
      label = monthLabel(d)
    } else {
      sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      label = monthLabel(d, true)
    }

    if (!groups.has(sortKey)) groups.set(sortKey, { sortKey, label, week: label, likes: 0, shares: 0, saved: 0, comments: 0 })
    const g = groups.get(sortKey)!
    g.likes += post.likes ?? 0
    g.shares += post.shares ?? 0
    g.saved += post.saved ?? 0
    g.comments += post.comments ?? 0
  }

  return [...groups.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

function postScore(p: any) {
  return (p.reach || 0) + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saved ?? 0)
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center rounded-lg" style={{ height, background: 'var(--border)', opacity: 0.4 }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function MetaOrganischPage() {
  const { startDate, endDate } = useDateRange()
  const { t, fmt, fmtK, fmtPct, shortDate, formatDate, monthLabel } = useLanguage()
  const chart = useChartColors()

  const [summary, setSummary] = useState<any>(null)
  const [facebook, setFacebook] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingExtended, setLoadingExtended] = useState(true)
  const [loadingDaily, setLoadingDaily] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setSummary(null)
      setFacebook(null)
      setPosts([])
      setDaily([])
      setError(null)
      setLoadingSummary(true)
      setLoadingPosts(true)
      setLoadingExtended(true)
      setLoadingDaily(true)

      async function safeFetch(url: string) {
        const r = await apiFetch(url)
        if (r.ok) return r.json()
        const body = await r.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${r.status}`)
      }

      safeFetch(`/api/instagram/summary?start=${startDate}&end=${endDate}`)
        .then(d => { if (active) setSummary(d) })
        .catch(e => { if (active) setError(e.message) })
        .finally(() => { if (active) setLoadingSummary(false) })

      safeFetch(`/api/instagram/posts?start=${startDate}&end=${endDate}`)
        .then(d => { if (active) setPosts(Array.isArray(d) ? d : []) })
        .catch(() => { if (active) setPosts([]) })
        .finally(() => { if (active) setLoadingPosts(false) })

      safeFetch(`/api/instagram/extended?start=${startDate}&end=${endDate}`)
        .then(ext => {
          if (!active) return
          if (ext?.instagram) setSummary((prev: any) => ({ ...prev, ...ext.instagram }))
          setFacebook(ext?.facebook ?? { available: false })
        })
        .catch(() => { if (active) setFacebook({ available: false }) })
        .finally(() => { if (active) setLoadingExtended(false) })

      safeFetch(`/api/instagram/daily?start=${startDate}&end=${endDate}`)
        .then(d => { if (active) setDaily(Array.isArray(d) ? d : []) })
        .catch(() => { if (active) setDaily([]) })
        .finally(() => { if (active) setLoadingDaily(false) })
    }, 600)

    return () => { active = false; clearTimeout(timer) }
  }, [startDate, endDate])

  const topPosts = [...posts].sort((a, b) => postScore(b) - postScore(a)).slice(0, 3)

  const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const totalShares = posts.reduce((s, p) => s + (p.shares ?? 0), 0)
  const totalSaved = posts.reduce((s, p) => s + (p.saved ?? 0), 0)
  const totalPostReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const summaryReach = summary?.reach
  const reach = summaryReach != null && summaryReach > 0
    ? summaryReach
    : totalPostReach > 0
      ? totalPostReach
      : Math.max(0, summaryReach ?? 0)
  const totalEngagement = totalLikes + totalComments + totalShares + totalSaved
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0
  const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0

  const chartData = toChartData(posts, startDate, endDate, monthLabel)
  const chartHasData = chartData.some(w => w.likes + w.shares + w.saved + w.comments > 0)

  const engagementMix = [
    { name: t('organisch.stat.likes'), value: totalLikes, color: ENGAGEMENT_COLORS[0] },
    { name: t('organisch.stat.comments'), value: totalComments, color: ENGAGEMENT_COLORS[1] },
    { name: t('organisch.stat.shares'), value: totalShares, color: ENGAGEMENT_COLORS[2] },
    { name: t('organisch.stat.saved'), value: totalSaved, color: ENGAGEMENT_COLORS[3] },
  ].filter(d => d.value > 0)

  const typeCounts = posts.reduce((acc: Record<string, number>, p) => {
    const key = p.type ?? 'IMAGE'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const contentTypeChart = Object.entries(typeCounts).map(([type, count]) => ({
    type: t(TYPE_BADGE_KEYS[type] ?? TYPE_BADGE_KEYS.IMAGE),
    count,
    fill: TYPE_CHART_COLORS[type] ?? '#888',
  }))

  const topReachChart = [...posts]
    .filter(p => (p.reach ?? 0) > 0)
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))
    .slice(0, 5)
    .map(p => ({
      name: truncateLabel(p.caption ?? '—', 18),
      reach: p.reach ?? 0,
    }))

  const dailyChart = daily.map(d => ({
    ...d,
    label: shortDate(d.date),
  }))

  const typeEngagement = Object.entries(
    posts.reduce((acc: Record<string, { reach: number; engagement: number; count: number }>, p) => {
      const key = p.type ?? 'IMAGE'
      if (!acc[key]) acc[key] = { reach: 0, engagement: 0, count: 0 }
      acc[key].reach += p.reach ?? 0
      acc[key].engagement += (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saved ?? 0)
      acc[key].count += 1
      return acc
    }, {}),
  ).map(([type, v]) => ({
    type: t(TYPE_BADGE_KEYS[type] ?? TYPE_BADGE_KEYS.IMAGE),
    rate: v.reach > 0 ? Math.round((v.engagement / v.reach) * 1000) / 10 : 0,
    posts: v.count,
    fill: TYPE_CHART_COLORS[type] ?? '#888',
  }))

  const insights: Array<{ type: 'good' | 'warn'; title: string; detail: string }> = []
  if (engagementRate > 3) {
    insights.push({ type: 'good', title: t('organisch.insight.engagementGood').replace('{rate}', fmt(engagementRate, 1)), detail: t('organisch.insight.engagementGoodDetail') })
  }
  if (summary?.new_followers > 0) {
    insights.push({ type: 'good', title: t('organisch.insight.followersGood').replace('{n}', fmt(summary.new_followers)), detail: t('organisch.insight.followersGoodDetail') })
  }
  const topType = contentTypeChart.sort((a, b) => b.count - a.count)[0]
  if (topType && posts.length >= 2) {
    insights.push({ type: 'good', title: t('organisch.insight.topFormat').replace('{type}', topType.type), detail: t('organisch.insight.topFormatDetail') })
  }
  if (posts.length === 0 && !loadingPosts) {
    insights.push({ type: 'warn', title: t('organisch.insight.noPosts'), detail: t('organisch.insight.noPostsDetail') })
  }

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBdr}`, borderRadius: 10, color: chart.tooltipText, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '10px 14px' },
    labelStyle: { color: chart.tooltipText, fontSize: 13, fontWeight: 700, marginBottom: 4 },
    itemStyle: { color: chart.tooltipText, fontSize: 12 },
  }

  const isInitialLoad = loadingSummary && !summary && !error
  const showContent = summary || posts.length > 0 || !loadingSummary

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />

      <div className="flex-1 lg:ml-64 flex flex-col overflow-hidden">
        <Header title={t('organisch.title')} description={t('organisch.desc')} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 page-in min-w-0">

            {isInitialLoad && (
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

            {showContent && !error && (
              <>
                {/* Account header */}
                <div className="stat-card mb-8 flex items-center gap-4 fade-in-up border-t-2 border-t-pink-500/50">
                  <div
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0"
                    style={{ boxShadow: '0 4px 20px rgba(236,72,153,0.4)' }}
                  >
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-foreground">@{summary?.username || summary?.name || 'instagram'}</p>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                      {loadingSummary ? (
                        <span className="inline-block h-4 w-32 skeleton-shimmer rounded" />
                      ) : (
                        <>
                          <AnimatedNumber value={summary?.followers ?? 0} delay={200} formatter={n => fmtK(n)} />
                          {' '}{t('organisch.followers')} · {fmt(summary?.media_count ?? 0)} {t('organisch.totalPostsSuffix')}
                        </>
                      )}
                    </p>
                  </div>
                  {!loadingSummary && summary?.new_followers !== 0 && summary?.new_followers != null && (
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${summary.new_followers >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {summary.new_followers > 0 ? '+' : ''}
                        <AnimatedNumber value={Math.abs(summary.new_followers)} delay={400} />
                      </p>
                      <p className="text-xs text-muted-foreground">{t('organisch.newFollowers')}</p>
                    </div>
                  )}
                </div>

                {/* Primary KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    label={t('organisch.stat.reach')}
                    tooltipKey="tooltip.reach"
                    value={loadingSummary ? '—' : <AnimatedNumber value={reach} delay={0} formatter={n => fmtK(n)} />}
                    icon={Eye}
                    delay={0}
                  />
                  <StatCard
                    label={t('organisch.stat.engagement')}
                    tooltipKey="tooltip.engagement"
                    value={loadingPosts ? '—' : <AnimatedNumber value={engagementRate} delay={100} formatter={n => fmtPct(n)} />}
                    icon={TrendingUp}
                    delay={100}
                  />
                  <StatCard
                    label={t('organisch.stat.likes')}
                    value={loadingPosts ? '—' : <AnimatedNumber value={totalLikes} delay={200} />}
                    icon={Heart}
                    delay={200}
                  />
                  <StatCard
                    label={t('organisch.postsThisPeriod')}
                    value={loadingPosts ? '—' : <AnimatedNumber value={posts.length} delay={300} formatter={n => String(Math.round(n))} />}
                    icon={Camera}
                    delay={300}
                  />
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <MetricKpi label={t('organisch.stat.comments')} value={loadingPosts ? '—' : fmt(totalComments)} />
                  <MetricKpi label={t('organisch.stat.shares')} value={loadingPosts ? '—' : fmt(totalShares)} tooltipKey="tooltip.shares" />
                  <MetricKpi label={t('organisch.stat.saved')} value={loadingPosts ? '—' : fmt(totalSaved)} />
                  <MetricKpi label={t('organisch.stat.avgLikes')} value={loadingPosts ? '—' : fmt(avgLikes, 1)} />
                  <MetricKpi label={t('organisch.stat.profileViews')} value={loadingSummary ? '—' : summary?.profile_views > 0 ? fmtK(summary.profile_views) : '—'} />
                </div>

                {/* Daily reach trend */}
                {(loadingDaily || dailyChart.length > 0) && (
                  <div className="stat-card mb-8">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-foreground font-bold text-lg">{t('organisch.chart.reachTrend')}</p>
                      {loadingDaily && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.reachTrendDesc')} · <DateRangeLabel start={startDate} end={endDate} /></p>
                    {loadingDaily ? (
                      <ChartSkeleton height={240} />
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={dailyChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis yAxisId="left" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                          <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                          <Bar yAxisId="left" dataKey="reach" name={t('organisch.stat.reach')} fill="#EC4899" radius={[4, 4, 0, 0]} opacity={0.85} />
                          <Line yAxisId="right" type="monotone" dataKey="profile_views" name={t('organisch.stat.profileViews')} stroke="#FF4D00" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}

                {/* Charts grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {(loadingPosts || engagementMix.length > 0) && (
                    <div className="stat-card">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-foreground font-bold text-lg">{t('organisch.chart.engagementMix')}</p>
                        {loadingPosts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.engagementMixDesc')}</p>
                      {loadingPosts ? (
                        <ChartSkeleton />
                      ) : (
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                              <Pie data={engagementMix} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                {engagementMix.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip {...tooltipStyle} formatter={(v: number) => [fmt(v), '']} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-3 flex-1">
                            {engagementMix.map(d => (
                              <div key={d.name}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                    {d.name}
                                  </span>
                                  <span className="font-bold text-foreground">{totalEngagement > 0 ? fmt((d.value / totalEngagement) * 100, 1) : 0}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${totalEngagement > 0 ? (d.value / totalEngagement) * 100 : 0}%`, background: d.color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(loadingPosts || contentTypeChart.length > 0) && (
                    <div className="stat-card">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-foreground font-bold text-lg">{t('organisch.chart.contentTypes')}</p>
                        {loadingPosts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.contentTypesDesc')}</p>
                      {loadingPosts ? (
                        <ChartSkeleton />
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={contentTypeChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis dataKey="type" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                            <Bar dataKey="count" name={t('organisch.stat.posts')} radius={[4, 4, 0, 0]}>
                              {contentTypeChart.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {(loadingPosts || chartHasData) && (
                    <div className="stat-card">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-foreground font-bold text-lg">{t('organisch.interactions')}</p>
                        {loadingPosts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.interactionsDesc')}</p>
                      {loadingPosts ? (
                        <ChartSkeleton />
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                            <XAxis dataKey="week" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                            <Bar dataKey="likes" name={t('organisch.stat.likes')} stackId="a" fill="#FF4D00" />
                            <Bar dataKey="comments" name={t('organisch.stat.comments')} stackId="a" fill="#4F7EFF" />
                            {totalShares > 0 && <Bar dataKey="shares" name={t('organisch.stat.shares')} stackId="a" fill="#10B981" />}
                            {totalSaved > 0 && <Bar dataKey="saved" name={t('organisch.stat.saved')} stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />}
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {(loadingPosts || topReachChart.length > 0) && (
                    <div className="stat-card">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-foreground font-bold text-lg">{t('organisch.chart.topByReach')}</p>
                        {loadingPosts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.topByReachDesc')}</p>
                      {loadingPosts ? (
                        <ChartSkeleton />
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={topReachChart} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                            <XAxis type="number" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                            <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtK(v), t('organisch.stat.reach')]} cursor={{ fill: chart.cursorFill }} />
                            <Bar dataKey="reach" fill="#EC4899" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}
                </div>

                {/* Engagement rate by format */}
                {!loadingPosts && typeEngagement.length > 1 && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.chart.engagementByType')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.engagementByTypeDesc')}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={typeEngagement} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="type" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${fmt(v)}%`, t('organisch.stat.engagement')]} cursor={{ fill: chart.cursorFill }} />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                          {typeEngagement.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top 3 posts */}
                {!loadingPosts && topPosts.length > 0 && (
                  <div className="mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.bestPosts')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('organisch.bestPostsDesc')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {topPosts.map((post, i) => {
                        const typeKey = post.type ?? 'IMAGE'
                        return (
                          <div key={post.id ?? i} className="stat-card border-t-2 border-t-pink-500/40">
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-2xl font-black ${RANK_COLOR[i]}`}>#{i + 1}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_BADGE_COLOR[typeKey] ?? TYPE_BADGE_COLOR.IMAGE}`}>
                                {t(TYPE_BADGE_KEYS[typeKey] ?? TYPE_BADGE_KEYS.IMAGE)}
                              </span>
                            </div>
                            <p className="text-foreground text-sm font-medium mb-3 line-clamp-3 leading-snug">{post.caption}</p>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              {post.reach > 0 && (
                                <div>
                                  <p className="text-muted-foreground">{t('organisch.stat.reach')}</p>
                                  <p className="font-bold text-accent">{fmtK(post.reach)}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">{t('organisch.stat.likes')}</p>
                                <p className="font-bold">{fmt(post.likes)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('organisch.stat.comments')}</p>
                                <p className="font-bold">{fmt(post.comments)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('organisch.stat.engagement')}</p>
                                <p className="font-bold">{post.engagement_rate != null ? `${fmt(post.engagement_rate, 1)}%` : '—'}</p>
                              </div>
                            </div>
                            <p className="text-muted-foreground text-xs mt-3">{formatDate(post.timestamp)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {summary?.reach_split_available && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.reachSplit')}</p>
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
                  </div>
                )}

                {!loadingExtended && facebook?.available && (
                  <div className="stat-card mb-8 border-l-4 border-l-blue-500/50">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.facebook')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{facebook.name} · {t('organisch.facebookDesc')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div><p className="text-xs text-muted-foreground">{t('organisch.facebookFans')}</p><p className="text-xl font-bold">{fmt(facebook.fans)}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('organisch.facebookImpressions')}</p><p className="text-xl font-bold">{fmtK(facebook.impressions)}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('organisch.facebookEngaged')}</p><p className="text-xl font-bold">{fmtK(facebook.engaged_users)}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('organisch.stat.posts')}</p><p className="text-xl font-bold">{facebook.posts?.length ?? 0}</p></div>
                    </div>
                    {(facebook.posts ?? []).length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {facebook.posts.slice(0, 4).map((post: any) => (
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
                    )}
                  </div>
                )}

                {insights.length > 0 && (
                  <div className="mb-8">
                    <p className="text-foreground font-bold text-lg mb-4">{t('organisch.insights.title')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {insights.map((ins, i) => (
                        <div
                          key={i}
                          className="rounded-xl p-4 flex items-start gap-3"
                          style={{
                            background: ins.type === 'good' ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)',
                            border: ins.type === 'good' ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(234,179,8,0.18)',
                          }}
                        >
                          <span className="text-lg">{ins.type === 'good' ? '✓' : '⚠'}</span>
                          <div>
                            <p className={`font-semibold text-sm mb-1 ${ins.type === 'good' ? 'text-emerald-500' : 'text-amber-400'}`}>{ins.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{ins.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts table */}
                <div>
                  <div className="mb-4">
                    <p className="text-foreground font-bold text-xl">{t('organisch.recentPosts')}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      <DateRangeLabel start={startDate} end={endDate} /> · {loadingPosts ? '…' : posts.length} {t('common.posts')}
                    </p>
                  </div>

                  {loadingPosts ? (
                    <div className="stat-card space-y-3">
                      {[...Array(5)].map((_, i) => <div key={i} className="h-10 skeleton-shimmer rounded" />)}
                    </div>
                  ) : posts.length === 0 ? (
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
                              {totalSaved > 0 && <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.stat.saved')}</th>}
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.engagement')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-5 py-3 whitespace-nowrap">{t('organisch.table.date')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {posts.map((post, i) => {
                              const typeKey = post.type ?? 'IMAGE'
                              return (
                                <tr key={post.id ?? i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50 transition-colors">
                                  <td className="px-5 py-3 text-foreground truncate">{post.caption}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${TYPE_BADGE_COLOR[typeKey] ?? TYPE_BADGE_COLOR.IMAGE}`}>
                                      {t(TYPE_BADGE_KEYS[typeKey] ?? TYPE_BADGE_KEYS.IMAGE)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{fmtK(post.reach ?? 0)}</td>
                                  <td className="px-4 py-3 text-right text-foreground font-semibold whitespace-nowrap">{fmt(post.likes)}</td>
                                  <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.comments)}</td>
                                  <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.shares ?? 0)}</td>
                                  {totalSaved > 0 && <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.saved)}</td>}
                                  <td className="px-4 py-3 text-right text-accent font-semibold whitespace-nowrap">{post.engagement_rate != null ? `${fmt(post.engagement_rate, 1)}%` : '—'}</td>
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
