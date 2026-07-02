'use client'

import { Info } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useRef, useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import { useLanguage } from '@/lib/language-context'

const TIP_W = 256
const TIP_EST_H = 88
const GAP = 10

interface MetricLabelProps {
  label: string
  tooltipKey?: string
  className?: string
}

function computeTooltipStyle(anchor: DOMRect): CSSProperties {
  const pad = 12
  const width = Math.min(TIP_W, window.innerWidth - pad * 2)
  let left = anchor.left + anchor.width / 2
  const half = width / 2
  if (left - half < pad) left = pad + half
  if (left + half > window.innerWidth - pad) left = window.innerWidth - pad - half

  const spaceAbove = anchor.top
  const showAbove = spaceAbove > TIP_EST_H + GAP + 8

  return {
    position: 'fixed',
    left,
    top: showAbove ? anchor.top - GAP : anchor.bottom + GAP,
    transform: showAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    width,
    zIndex: 9999,
  }
}

function FloatingTooltip({ text, anchor, open }: { text: string; anchor: DOMRect | null; open: boolean }) {
  const [style, setStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !anchor) return
    setStyle(computeTooltipStyle(anchor))
  }, [open, anchor, text])

  if (!open || !anchor || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="tooltip"
      className="px-3 py-2.5 rounded-lg text-xs font-normal normal-case tracking-normal leading-relaxed pointer-events-none"
      style={{
        ...style,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
      }}
    >
      {text}
    </div>,
    document.body,
  )
}

export function MetricLabel({ label, tooltipKey, className = '' }: MetricLabelProps) {
  const { t } = useLanguage()
  const tip = tooltipKey ? t(tooltipKey) : null
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  if (!tip || tip === tooltipKey) {
    return <span className={className}>{label}</span>
  }

  function show() {
    if (triggerRef.current) {
      setAnchor(triggerRef.current.getBoundingClientRect())
      setOpen(true)
    }
  }

  function hide() {
    setOpen(false)
  }

  return (
    <>
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span>{label}</span>
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 opacity-40 hover:opacity-90 focus:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-opacity cursor-pointer flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          aria-label={tip}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          <Info className="w-3 h-3" strokeWidth={2.25} aria-hidden />
        </button>
      </span>
      <FloatingTooltip text={tip} anchor={anchor} open={open} />
    </>
  )
}

interface MetricKpiProps {
  label: string
  value: ReactNode
  tooltipKey?: string
  accent?: boolean
  change?: { value: number; isPositive: boolean }
}

export function MetricKpi({ label, value, tooltipKey, accent = false, change }: MetricKpiProps) {
  const { t } = useLanguage()
  const isUp = change?.isPositive === true

  return (
    <div className="stat-card flex items-center justify-between py-4 gap-3">
      <p className="text-muted-foreground text-sm font-medium min-w-0 pr-3">
        <MetricLabel label={label} tooltipKey={tooltipKey} />
      </p>
      <div className="text-right flex-shrink-0">
        <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
        {change ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1"
            style={isUp ? {
              background: 'rgba(34,197,94,0.10)',
              color: '#22C55E',
              border: '1px solid rgba(34,197,94,0.22)',
            } : {
              background: 'rgba(239,68,68,0.10)',
              color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.22)',
            }}
          >
            {isUp ? '↑' : '↓'} {change.value.toFixed(1)}%
            <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>{t('common.vsPrev')}</span>
          </span>
        ) : (
          <span className="inline-block h-5" />
        )}
      </div>
    </div>
  )
}
