'use client'

import { useLanguage } from '@/lib/language-context'

interface AnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  formatter?: (n: number) => string
}

export function AnimatedNumber({
  value,
  formatter,
}: AnimatedNumberProps) {
  const { fmt } = useLanguage()
  const target = Number.isFinite(value) ? value : 0
  const format = formatter ?? ((n: number) => fmt(Math.round(n), 0))
  return <span suppressHydrationWarning>{format(target)}</span>
}
