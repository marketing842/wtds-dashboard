'use client'

import { useState } from 'react'
import { Calendar, ArrowRight } from 'lucide-react'
import { useDateRange } from '@/lib/date-range-context'

const PRESETS = [
  { label: '7D',  days: 7  },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

export function DateRangePicker() {
  const { startDate, endDate, setStartDate, setEndDate, setPreset } = useDateRange()
  const [activePreset, setActivePreset] = useState<number | null>(30)

  function handlePreset(days: number) {
    setActivePreset(days)
    setPreset(days)
  }

  return (
    <div className="flex items-center gap-2.5">
      <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-subtle)' }} />

      {/* Preset pills — toggle group */}
      <div
        className="flex items-center gap-px rounded-lg p-0.5"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        {PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => handlePreset(p.days)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-150"
            style={activePreset === p.days ? {
              background: 'var(--accent)',
              color:      '#fff',
            } : {
              background: 'transparent',
              color:      'var(--text-muted)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs — hidden on phones to save space (presets remain) */}
      <div className="hidden sm:flex items-center gap-1">
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={e => { setActivePreset(null); setStartDate(e.target.value) }}
          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold outline-none transition-all duration-150"
          style={{
            background:  'var(--bg)',
            border:      '1px solid var(--border)',
            color:       'var(--text-primary)',
            width:       '7.5rem',
          }}
          onFocus={e  => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e   => (e.target.style.borderColor = 'var(--border)')}
        />
        <div
          className="flex items-center justify-center w-7 h-6 rounded-md flex-shrink-0"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
        >
          <ArrowRight className="w-3 h-3" style={{ color: 'var(--accent)' }} />
        </div>
        <input
          type="date"
          value={endDate}
          min={startDate}
          onChange={e => { setActivePreset(null); setEndDate(e.target.value) }}
          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold outline-none transition-all duration-150"
          style={{
            background:  'var(--bg)',
            border:      '1px solid var(--border)',
            color:       'var(--text-primary)',
            width:       '7.5rem',
          }}
          onFocus={e  => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e   => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
    </div>
  )
}
