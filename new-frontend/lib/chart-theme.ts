import { useTheme } from 'next-themes'

export function useChartColors() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  return {
    isDark,
    grid: isDark ? '#2E3350' : '#E5E7EB',
    tick: isDark ? '#8B92A9' : '#9CA3AF',
    tooltipBg: isDark ? '#21253A' : '#FFFFFF',
    tooltipBdr: isDark ? '#2E3350' : '#E2E6F0',
    tooltipText: isDark ? '#F0F2FF' : '#111827',
    cursorFill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  }
}

export function shortDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function truncateLabel(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
