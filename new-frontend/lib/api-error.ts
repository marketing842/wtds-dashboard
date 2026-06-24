/** Parse error JSON from a failed apiFetch response. */
export async function parseApiError(res: Response): Promise<{ message: string; code?: string }> {
  const body = await res.json().catch(() => ({}))
  return {
    message: body?.error ?? `HTTP ${res.status}`,
    code: body?.code,
  }
}

/** Map stable backend error codes to translation keys. */
export function apiErrorKey(code: string | undefined, provider = 'analytics'): string | null {
  switch (code) {
    case 'wrong_scope':
      return `apiError.${provider}.wrongScope`
    case 'auth_expired':
    case 'unauthorized':
      return `apiError.${provider}.authExpired`
    case 'forbidden':
      return `apiError.${provider}.forbidden`
    case 'rate_limited':
      return 'apiError.rateLimited'
    case 'timeout':
      return 'apiError.timeout'
    case 'upstream_error':
      return 'apiError.upstream'
    default:
      return null
  }
}
