import { MoreVertical, TrendingUp } from 'lucide-react'

interface CampaignCardProps {
  name: string
  status: 'active' | 'paused' | 'completed'
  impressions: number
  clicks: number
  ctr: number
  spend: number
  revenue: number
}

export function CampaignCard({
  name,
  status,
  impressions,
  clicks,
  ctr,
  spend,
  revenue,
}: CampaignCardProps) {
  const statusDot = {
    active: 'bg-emerald-500',
    paused: 'bg-amber-500',
    completed: 'bg-muted',
  }

  const roi = ((revenue - spend) / spend * 100).toFixed(1)

  return (
    <div className="card card-orange-accent">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-sans font-600 text-foreground leading-snug">{name}</h4>
          <div className="flex items-center gap-2 mt-3">
            <div className={`status-dot ${statusDot[status]}`} />
            <span className="label text-muted-foreground">{status.toUpperCase()}</span>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-accent transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/20 dark:border-slate-700/20">
        <div>
          <p className="label text-muted-foreground">Impressions</p>
          <p className="font-sans font-700 text-lg text-foreground mt-1">{(impressions / 1000).toFixed(0)}K</p>
        </div>
        <div>
          <p className="label text-muted-foreground">Clicks</p>
          <p className="font-sans font-700 text-lg text-foreground mt-1">{clicks.toLocaleString()}</p>
        </div>
        <div>
          <p className="label text-muted-foreground">CTR</p>
          <p className="font-sans font-700 text-lg text-foreground mt-1">{ctr.toFixed(2)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-700/20 dark:border-slate-700/20">
        <div>
          <p className="label text-muted-foreground">Spend / Revenue</p>
          <p className="font-sans font-600 text-foreground mt-1">
            ${spend.toLocaleString()} / <span className="text-accent">${revenue.toLocaleString()}</span>
          </p>
        </div>
        <div className={`flex items-center gap-2 font-sans font-700 ${roi > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          <TrendingUp className="w-4 h-4" />
          <span>{roi}%</span>
        </div>
      </div>
    </div>
  )
}
