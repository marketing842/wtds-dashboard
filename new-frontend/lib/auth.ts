const COOKIE = 'auth-token'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

export function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)auth-token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setToken(token: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Strict`
}

export function clearToken() {
  document.cookie = `${COOKIE}=; path=/; max-age=0`
}

export function getTokenPayload(): { role?: string; clientId?: string; email?: string } | null {
  const token = getToken()
  if (!token) return null
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}
