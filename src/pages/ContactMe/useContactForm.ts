import { useRef, useState } from 'react'
import { apiRoutes, postJson } from '../../api/api'

// Values double as the submission status; no magic strings.
export const ContactStatus = {
  idle: 'idle',
  sending: 'sending',
  success: 'success',
  error: 'error',
} as const
export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus]

export type ContactValues = {
  name: string
  email: string
  message: string
  website: string // honeypot — humans leave it blank
}

export function useContactForm() {
  const [status, setStatus] = useState<ContactStatus>(ContactStatus.idle)
  // Start of the current submission window — reset after each send so a rapid repeat is caught by
  // the server time-trap, not just the very first instant submit.
  const windowStart = useRef(Date.now())

  async function submit(values: ContactValues): Promise<void> {
    const elapsedMs = Date.now() - windowStart.current
    setStatus(ContactStatus.sending)
    try {
      await postJson(apiRoutes.contact, {
        message: values.message,
        name: values.name || undefined,
        email: values.email || undefined,
        website: values.website || undefined,
        elapsedMs,
        // Coarse "where from" context — free signals, no geolocation prompt.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        referrer: document.referrer || undefined,
      })
      setStatus(ContactStatus.success)
      windowStart.current = Date.now()
    } catch {
      setStatus(ContactStatus.error)
    }
  }

  return { status, submit }
}
