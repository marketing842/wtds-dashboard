'use client'

import { useLanguage } from '@/lib/language-context'

function fmt(n: number) {
  return Math.round(n).toLocaleString('nl-NL')
}

export function FlowFunnelVisual({ flow, t }: { flow: any; t: (k: string) => string }) {
  const delivered = flow.delivered ?? 0
  const opens = flow.opens ?? Math.round((flow.open_rate / 100) * delivered)
  const clicks = flow.clicks ?? Math.round((flow.click_rate / 100) * delivered)
  if (delivered <= 0) return null

  const steps = [
    { key: 'delivered', label: t('email.funnel.delivered'), value: delivered, pct: 100, color: '#4F7EFF' },
    { key: 'opens', label: t('email.funnel.opened'), value: opens, pct: (opens / delivered) * 100, color: '#10B981' },
    { key: 'clicks', label: t('email.funnel.clicked'), value: clicks, pct: (clicks / delivered) * 100, color: '#FF4D00' },
  ]

  return (
    <div className="space-y-2 mt-4">
      {steps.map((step, i) => (
        <div key={step.key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{step.label}</span>
            <span className="font-semibold text-foreground">{fmt(step.value)} <span className="text-muted-foreground font-normal">({fmt(step.pct)}%)</span></span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(step.pct, i === 0 ? 4 : 2)}%`, background: step.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
