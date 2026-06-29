'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/language-context'

interface AnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  formatter?: (n: number) => string
}

export function AnimatedNumber({
  value,
  duration = 1400,
  delay = 120,
  formatter,
}: AnimatedNumberProps) {
  const { fmt } = useLanguage()
  const format = formatter ?? ((n: number) => fmt(Math.round(n), 0))
  const [current, setCurrent] = useState(0)
  const rafRef  = useRef<number>()
  const alive   = useRef(true)

  useEffect(() => {
    alive.current = true
    setCurrent(0)
    if (!value || value === 0) return

    const tid = setTimeout(() => {
      const t0  = performance.now()
      const tick = (now: number) => {
        if (!alive.current) return
        const t    = Math.min((now - t0) / duration, 1)
        const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) // expo-out
        setCurrent(value * ease)
        if (t < 1) rafRef.current = requestAnimationFrame(tick)
        else       setCurrent(value)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      alive.current = false
      clearTimeout(tid)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, delay])

  return <>{format(current)}</>
}
