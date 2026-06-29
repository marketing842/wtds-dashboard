'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { StatCard } from '@/components/StatCard'
import { MetricLabel } from '@/components/MetricLabel'
import { useDateRange } from '@/lib/date-range-context'
import {
  Users, Eye, Share2, Bookmark, TrendingUp, Camera, Loader2, Heart, MessageCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  Line, ComposedChart, CartesianGrid,
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

function postScore(p: any) {
  return (p.reach || 0) + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saved ?? 0)
}

function EngagementMeter({
  label,
  value,
  max,
  color,
  formatted,
}: {
  label: string
  value: number
  max: number
  color: string
  formatted: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-sm font-bold text-foreground tabular-nums flex-shrink-0">{formatted}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: value > 0 ? `${Math.max(pct, 3)}%` : '0%',
            background: color,
          }}
        />
      </div>
    </div>
  )
}

function SummaryTile({ label, value, tooltipKey }: { label: string; value: ReactNode; tooltipKey?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--border)' }}>
      <p className="text-xs text-muted-foreground">
        <MetricLabel label={label} tooltipKey={tooltipKey} />
      </p>
      <p className="text-lg font-bold mt-1 tabular-nums">{value}</p>
    </div>
  )
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center rounded-lg" style={{ height, background: 'var(--border)', opacity: 0.4 }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function ChartFrame({
  loading,
  height,
  chartKey,
  children,
}: {
  loading: boolean
  height: number
  chartKey: string
  children: ReactNode
}) {
  if (loading) return <ChartSkeleton height={height} />
  return (
    <div key={chartKey} style={{ width: '100%', height }}>
      {children}
    </div>
  )
}

export default function MetaOrganischPage() {
  const { startDate, endDate } = useDateRange()
  const { t, fmt, fmtK, fmtPct, shortDate, formatDate } = useLanguage()
  const chart = useChartColors()

  const [summary, setSummary] = useState<any>(null)
  const [facebook, setFacebook] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [postMetricsAvailable, setPostMetricsAvailable] = useState<Record<string, boolean>>({})
  const [dailyMetricsAvailable, setDailyMetricsAvailable] = useState<Record<string, boolean>>({})
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
      setPostMetricsAvailable({})
      setDailyMetricsAvailable({})
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
        .then(d => {
          if (!active) return
          if (Array.isArray(d)) {
            setPosts(d)
            setPostMetricsAvailable({ shares: true, saved: true, post_reach: true })
          } else {
            setPosts(Array.isArray(d?.posts) ? d.posts : [])
            setPostMetricsAvailable(d?.metrics_available ?? {})
          }
        })
        .catch(() => {
          if (active) {
            setPosts([])
            setPostMetricsAvailable({})
          }
        })
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
        .then(d => {
          if (!active) return
          if (Array.isArray(d)) {
            setDaily(d)
            setDailyMetricsAvailable({ reach: true, profile_views: true, new_followers: true })
          } else {
            setDaily(Array.isArray(d?.daily) ? d.daily : [])
            setDailyMetricsAvailable(d?.metrics_available ?? {})
          }
        })
        .catch(() => {
          if (active) {
            setDaily([])
            setDailyMetricsAvailable({})
          }
        })
        .finally(() => { if (active) setLoadingDaily(false) })
    }, 600)

    return () => { active = false; clearTimeout(timer) }
  }, [startDate, endDate])

  const topPosts = [...posts].sort((a, b) => postScore(b) - postScore(a)).slice(0, 3)

  const metricsAvailable = {
    reach: summary?.metrics_available?.reach ?? dailyMetricsAvailable.reach ?? true,
    profile_views: summary?.metrics_available?.profile_views ?? dailyMetricsAvailable.profile_views ?? false,
    new_followers: summary?.metrics_available?.new_followers ?? dailyMetricsAvailable.new_followers ?? false,
    shares: postMetricsAvailable.shares ?? false,
    saved: postMetricsAvailable.saved ?? false,
    post_reach: postMetricsAvailable.post_reach ?? false,
  }

  const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const totalShares = metricsAvailable.shares ? posts.reduce((s, p) => s + (p.shares ?? 0), 0) : 0
  const totalSaved = metricsAvailable.saved ? posts.reduce((s, p) => s + (p.saved ?? 0), 0) : 0
  const totalPostReach = metricsAvailable.post_reach
    ? posts.reduce((s, p) => s + (p.reach ?? 0), 0)
    : 0
  const summaryReach = summary?.reach
  const reach = summaryReach != null && summaryReach > 0
    ? summaryReach
    : totalPostReach > 0
      ? totalPostReach
      : Math.max(0, summaryReach ?? 0)
  const totalEngagement = totalLikes + totalComments
    + (metricsAvailable.shares ? totalShares : 0)
    + (metricsAvailable.saved ? totalSaved : 0)
  const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0
  const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0

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

  const dailyChart = daily.map(d => ({
    ...d,
    label: shortDate(d.date),
  }))
  const chartKey = `${startDate}_${endDate}`
  const profileViewsTotal = metricsAvailable.profile_views
    ? Math.max(summary?.profile_views ?? 0, daily.reduce((s, d) => s + (d.profile_views ?? 0), 0))
    : 0

  const engagementBreakdownAll = [
    { key: 'likes', name: t('organisch.stat.likes'), value: totalLikes, fill: ENGAGEMENT_COLORS[0], show: true },
    { key: 'comments', name: t('organisch.stat.comments'), value: totalComments, fill: ENGAGEMENT_COLORS[1], show: true },
    { key: 'shares', name: t('organisch.stat.shares'), value: totalShares, fill: ENGAGEMENT_COLORS[2], show: metricsAvailable.shares },
    { key: 'saved', name: t('organisch.stat.saved'), value: totalSaved, fill: ENGAGEMENT_COLORS[3], show: metricsAvailable.saved },
  ]
  const engagementBreakdown = engagementBreakdownAll.filter(d => d.show)
  const engagementMax = Math.max(...engagementBreakdown.map(d => d.value), 1)
  const showExtendedEngagement = metricsAvailable.shares || metricsAvailable.saved

  const postPerformanceChart = [...posts]
    .sort((a, b) => postScore(b) - postScore(a))
    .slice(0, 6)
    .map(p => ({
      name: truncateLabel(p.caption ?? '—', 16),
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
    }))
  const showPostPerformanceChart = postPerformanceChart.length >= 2

  const insights: Array<{ type: 'good' | 'warn'; title: string; detail: string }> = []
  if (engagementRate > 3) {
    insights.push({ type: 'good', title: t('organisch.insight.engagementGood').replace('{rate}', fmt(engagementRate, 1)), detail: t('organisch.insight.engagementGoodDetail') })
  }
  if (summary?.new_followers != null && metricsAvailable.new_followers && summary.new_followers !== 0) {
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
                  {!loadingSummary && metricsAvailable.new_followers && summary?.new_followers != null && summary.new_followers !== 0 && (
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

                {/* Daily reach trend */}
                {(loadingDaily || dailyChart.length > 0) && (
                  <div className="stat-card mb-8">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-foreground font-bold text-lg">{t('organisch.chart.reachTrend')}</p>
                      {loadingDaily && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      {(metricsAvailable.profile_views ? t('organisch.chart.reachTrendDesc') : t('organisch.chart.reachTrendDescReachOnly'))} · <DateRangeLabel start={startDate} end={endDate} />
                    </p>
                    <ChartFrame loading={loadingDaily} height={280} chartKey={`organic-daily-${chartKey}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis yAxisId="left" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} hide={!metricsAvailable.profile_views} />
                          <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                          <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                          <Bar yAxisId="left" dataKey="reach" name={t('organisch.stat.reach')} fill="#EC4899" radius={[4, 4, 0, 0]} opacity={0.9} isAnimationActive={false} />
                          {metricsAvailable.profile_views && (
                            <Line yAxisId="right" type="monotone" dataKey="profile_views" name={t('organisch.stat.profileViews')} stroke="#FF4D00" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 items-stretch">
                  <div className="stat-card xl:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-foreground font-bold text-lg">{t('organisch.chart.engagementBreakdown')}</p>
                      {loadingPosts && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="text-muted-foreground text-sm mb-5">
                      {showExtendedEngagement
                        ? t('organisch.chart.engagementBreakdownDesc')
                        : t('organisch.chart.engagementBreakdownDescBasic')}
                    </p>
                    {loadingPosts ? (
                      <ChartSkeleton height={220} />
                    ) : (
                      <div className="space-y-5 flex-1">
                        {engagementBreakdown.map(item => (
                          <EngagementMeter
                            key={item.name}
                            label={item.name}
                            value={item.value}
                            max={engagementMax}
                            color={item.fill}
                            formatted={fmt(item.value, 0)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="stat-card flex flex-col">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.section.contentSummary')}</p>
                    <p className="text-muted-foreground text-sm mb-5">{t('organisch.chart.contentTypesDesc')}</p>
                    <div className="flex-1 flex flex-col gap-5">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('organisch.chart.contentTypes')}</p>
                        <div className="flex flex-wrap gap-2">
                          {contentTypeChart.length > 0 ? contentTypeChart.map(item => (
                            <span
                              key={item.type}
                              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                              style={{ borderColor: `${item.fill}55`, background: `${item.fill}18`, color: item.fill }}
                            >
                              {item.type}
                              <span className="opacity-80">{item.count}</span>
                            </span>
                          )) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SummaryTile label={t('organisch.stat.reach')} value={loadingSummary ? '—' : fmtK(reach)} />
                        <SummaryTile label={t('organisch.stat.engagement')} value={loadingPosts ? '—' : fmtPct(engagementRate)} />
                        <SummaryTile label={t('organisch.stat.posts')} value={loadingPosts ? '—' : fmt(posts.length, 0)} />
                        <SummaryTile label={t('organisch.stat.avgLikes')} value={loadingPosts ? '—' : fmt(avgLikes, 1)} />
                        <SummaryTile label={t('organisch.stat.comments')} value={loadingPosts ? '—' : fmt(totalComments, 0)} />
                        {metricsAvailable.shares && (
                          <SummaryTile label={t('organisch.stat.shares')} value={loadingPosts ? '—' : fmt(totalShares, 0)} tooltipKey="tooltip.shares" />
                        )}
                        {metricsAvailable.saved && (
                          <SummaryTile label={t('organisch.stat.saved')} value={loadingPosts ? '—' : fmt(totalSaved, 0)} />
                        )}
                        {metricsAvailable.profile_views && (
                          <SummaryTile
                            label={t('organisch.stat.profileViews')}
                            value={loadingSummary && loadingDaily ? '—' : fmtK(profileViewsTotal)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {showPostPerformanceChart && (
                  <div className="stat-card mb-8">
                    <p className="text-foreground font-bold text-lg mb-1">{t('organisch.chart.postPerformance')}</p>
                    <p className="text-muted-foreground text-sm mb-4">{t('organisch.chart.postPerformanceDesc')}</p>
                    <ChartFrame loading={false} height={240} chartKey={`organic-posts-${chartKey}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={postPerformanceChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%" barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                          <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={56} />
                          <YAxis tick={{ fill: chart.tick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...tooltipStyle} cursor={{ fill: chart.cursorFill }} />
                          <Legend wrapperStyle={{ fontSize: 12, color: chart.tick }} />
                          <Bar dataKey="likes" name={t('organisch.stat.likes')} fill="#FF4D00" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                          <Bar dataKey="comments" name={t('organisch.stat.comments')} fill="#4F7EFF" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartFrame>
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
                              {metricsAvailable.post_reach && (post.reach ?? 0) > 0 && (
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
                              {metricsAvailable.post_reach && (
                                <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.reach')}</th>
                              )}
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.likes')}</th>
                              <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.table.comments')}</th>
                              {metricsAvailable.shares && (
                                <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.stat.shares')}</th>
                              )}
                              {metricsAvailable.saved && (
                                <th className="text-right text-muted-foreground text-xs font-medium px-4 py-3">{t('organisch.stat.saved')}</th>
                              )}
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
                                  {metricsAvailable.post_reach && (
                                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{fmtK(post.reach ?? 0)}</td>
                                  )}
                                  <td className="px-4 py-3 text-right text-foreground font-semibold whitespace-nowrap">{fmt(post.likes)}</td>
                                  <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.comments)}</td>
                                  {metricsAvailable.shares && (
                                    <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.shares ?? 0)}</td>
                                  )}
                                  {metricsAvailable.saved && (
                                    <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">{fmt(post.saved ?? 0)}</td>
                                  )}
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
