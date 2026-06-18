import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label:   string
  value:   string | number
  change?: { value: number; isPositive: boolean }
  icon:    LucideIcon
}

export function StatCard({ label, value, change, icon: Icon }: StatCardProps) {
  return (
    <div className="stat-card group">

      {/* Label + icon row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: 'var(--accent-soft)',
            border:     '1px solid var(--accent-border)',
            boxShadow:  '0 2px 8px rgba(255,77,0,0.12)',
          }}
        >
          <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
      </div>

      {/* Value */}
      <p
        className="mb-3 leading-none truncate"
        style={{
          fontFamily:    "'Inter', sans-serif",
          fontWeight:    800,
          fontSize:      '2rem',
          letterSpacing: '-0.03em',
          color:         'var(--text-primary)',
        }}
      >
        {value}
      </p>

      {/* Change badge */}
      {change ? (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={change.isPositive ? {
            background: 'rgba(34,197,94,0.10)',
            color:      '#22C55E',
            border:     '1px solid rgba(34,197,94,0.22)',
          } : {
            background: 'rgba(239,68,68,0.10)',
            color:      '#EF4444',
            border:     '1px solid rgba(239,68,68,0.22)',
          }}
        >
          {change.isPositive ? '↑' : '↓'} {Math.abs(change.value).toFixed(1)}%
          <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>vs prev</span>
        </span>
      ) : (
        <span className="inline-block h-5" />
      )}

    </div>
  )
}
