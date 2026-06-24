'use client'

import { HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLanguage } from '@/lib/language-context'

interface MetricLabelProps {
  label: string
  tooltipKey?: string
  className?: string
}

export function MetricLabel({ label, tooltipKey, className = '' }: MetricLabelProps) {
  const { t } = useLanguage()
  const tip = tooltipKey ? t(tooltipKey) : null

  if (!tip || tip === tooltipKey) {
    return <span className={className}>{label}</span>
  }

  return (
    <span className={`inline-flex items-center gap-1 group/tip ${className}`}>
      {label}
      <span className="relative inline-flex">
        <HelpCircle
          className="w-3.5 h-3.5 opacity-50 group-hover/tip:opacity-100 transition-opacity cursor-help flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          aria-hidden
        />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg text-xs font-normal normal-case tracking-normal leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-lg"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {tip}
        </span>
      </span>
    </span>
  )
}

interface MetricKpiProps {
  label: string
  value: ReactNode
  tooltipKey?: string
  accent?: boolean
}

export function MetricKpi({ label, value, tooltipKey, accent = false }: MetricKpiProps) {
  return (
    <div className="stat-card flex items-center justify-between py-4">
      <p className="text-muted-foreground text-sm font-medium">
        <MetricLabel label={label} tooltipKey={tooltipKey} />
      </p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}
