import { useEffect, useState } from 'react'
import { RecallCountry } from '../recall.types'

const SUPPORTED: Set<string> = new Set(Object.values(RecallCountry))

// Detects the user's country via the /api/geo serverless function (same origin).
// Returns the detected RecallCountry, or null if geo is unavailable / unsupported / errored.
export function useGeo(): RecallCountry | null {
  const [country, setCountry] = useState<RecallCountry | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/geo', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) return null
        return res.json() as Promise<unknown>
      })
      .then((data) => {
        if (
          data !== null &&
          typeof data === 'object' &&
          'country' in data &&
          typeof (data as Record<string, unknown>).country === 'string' &&
          SUPPORTED.has((data as Record<string, unknown>).country as string)
        ) {
          setCountry((data as Record<string, unknown>).country as RecallCountry)
        }
      })
      .catch(() => {
        // Silently swallow all errors including AbortError
      })

    return () => controller.abort()
  }, [])

  return country
}
