import type { Lang } from './translations'

export function localeTag(lang: Lang): string {
  return lang === 'nl' ? 'nl-NL' : 'en-GB'
}

export function makeFormatters(lang: Lang) {
  const locale = localeTag(lang)

  return {
    locale,
    fmt(n: number, decimals = 0) {
      return n.toLocaleString(locale, { maximumFractionDigits: decimals })
    },
    fmtEur(n: number) {
      return `€${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    shortDate(iso: string) {
      return new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    },
    formatDate(ts: string) {
      return new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
    },
    monthLabel(d: Date, withYear = false) {
      return d.toLocaleDateString(locale, withYear ? { month: 'short', year: '2-digit' } : { month: 'short' })
    },
    fmtPct(n: number, decimals = 1) {
      return `${n.toLocaleString(locale, { maximumFractionDigits: decimals })}%`
    },
    fmtK(n: number, decimals = 1) {
      return n >= 1000
        ? `${(n / 1000).toLocaleString(locale, { maximumFractionDigits: decimals })}K`
        : n.toLocaleString(locale, { maximumFractionDigits: 0 })
    },
  }
}

export type AppFormatters = ReturnType<typeof makeFormatters>
