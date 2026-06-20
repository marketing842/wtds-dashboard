'use client'

import { DateRangePicker } from '@/components/DateRangePicker'
import { ModeToggle } from '@/components/ModeToggle'
import { useClientInfo } from '@/lib/client-context'

export function Header({ title, description, showDatePicker = true }: { title: string; description?: string; showDatePicker?: boolean }) {
  const clientInfo = useClientInfo()

  return (
    <header
      className="h-16 sticky top-0 z-40 flex items-center"
      style={{
        background:   'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow:    '0 1px 0 var(--border), 0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex-1 pl-16 pr-4 sm:px-8 flex items-center justify-between gap-3 sm:gap-6">

        {/* ── Page title ── */}
        <div className="min-w-0">
          <h1
            className="leading-none truncate text-xl sm:text-[1.75rem]"
            style={{
              fontFamily:    "'Barlow Condensed', sans-serif",
              fontWeight:    900,
              letterSpacing: '-0.025em',
              textTransform: 'uppercase',
              color:         'var(--text-primary)',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em] mt-0.5 hidden sm:block"
              style={{ color: 'var(--text-subtle)' }}
            >
              {description}
            </p>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Date range — hidden on pages where it doesn't apply */}
          {showDatePicker && (
          <div className="flex items-center px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <DateRangePicker />
          </div>
          )}

          <div className="w-px h-5 mx-1 hidden sm:block" style={{ background: 'var(--border)' }} />

          <ModeToggle />

          <div className="w-px h-5 mx-1 hidden sm:block" style={{ background: 'var(--border)' }} />

          {/* Client identity chip — hidden on phones (client already shown in sidebar) */}
          <div
            className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {clientInfo?.name ?? '—'}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mt-0.5"
                style={{ color: 'var(--text-muted)' }}>
                Marketing
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--accent)',
                boxShadow:  '0 4px 12px rgba(255,77,0,0.38)',
              }}
            >
              <span className="text-xs font-black text-white">
                {clientInfo?.initial ?? '?'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  )
}
