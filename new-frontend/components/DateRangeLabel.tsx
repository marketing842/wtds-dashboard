'use client'

import { ArrowRight } from 'lucide-react'

export function DateRangeLabel({ start, end }: { start: string; end: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span>{start}</span>
      <span
        className="inline-flex items-center justify-center w-5 h-[18px] rounded-md flex-shrink-0"
        style={{
          background: 'var(--accent-soft)',
          border:     '1px solid var(--accent-border)',
        }}
      >
        <ArrowRight className="w-2.5 h-2.5" style={{ color: 'var(--accent)' }} />
      </span>
      <span>{end}</span>
    </span>
  )
}
