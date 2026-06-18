'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

function toStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function presetDates(days: number) {
  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return { start: toStr(start), end: toStr(end) }
}

type Ctx = {
  startDate: string
  endDate: string
  setStartDate: (d: string) => void
  setEndDate: (d: string) => void
  setPreset: (days: number) => void
}

const DateRangeContext = createContext<Ctx | null>(null)

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const defaults = presetDates(30)
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)

  function setPreset(days: number) {
    const d = presetDates(days)
    setStartDate(d.start)
    setEndDate(d.end)
  }

  return (
    <DateRangeContext.Provider value={{ startDate, endDate, setStartDate, setEndDate, setPreset }}>
      {children}
    </DateRangeContext.Provider>
  )
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext)
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider')
  return ctx
}
