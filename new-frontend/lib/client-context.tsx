'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { getToken } from '@/lib/auth'

interface ClientInfo {
  id: string | null
  name: string
  initial: string
  role: 'admin' | 'viewer'
}

const ClientContext = createContext<ClientInfo | null>(null)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientInfo | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!getToken()) return

    apiFetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(info => {
        if (!info) return
        setClient({ id: info.clientId, name: info.clientName, initial: info.initial, role: info.role })
        if (info.role === 'admin' && !pathname.startsWith('/admin')) {
          router.replace('/admin')
        }
      })
      .catch(() => {})
  }, [pathname, router])

  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
}

export function useClientInfo() {
  return useContext(ClientContext)
}
