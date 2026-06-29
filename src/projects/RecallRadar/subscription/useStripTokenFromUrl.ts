import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// Capture the `token` query param once on mount, then strip it from the address bar. The token
// arrives in the email-link URL (unavoidable for a clicked link), but it shouldn't linger in browser
// history or leak via the Referer header on later navigations, so we drop it once read. Returns the
// captured token (null when absent) — callers forward it to the API in a header.
export function useStripTokenFromUrl(): string | null {
  const [params] = useSearchParams()
  const [token] = useState(() => params.get('token'))

  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  return token
}
