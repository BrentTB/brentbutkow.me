import { useState, useCallback } from 'react'
import type {
  RecallCategory,
  RecallCountry,
  RecallFilterValues,
  SeverityLabel,
} from '../recall.types'
import { apiRoutes, apiUrl } from '../../../api/api'
import { FILTER_FIELD_MAP, filtersToPayload, parseValidationErrors } from './subscription-api'

// submit() needs the raw status code (201 vs 200 vs 409 vs 422), so it calls fetch directly with
// the shared apiUrl rather than fetchJson, which discards the response.

export type SubscriptionFormState = {
  email: string
  countries: RecallCountry[]
  entities: string[]
  companies: string[]
  categories: RecallCategory[]
  minSeverity: SeverityLabel | ''
}

const SubscriptionStatus = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error',
} as const
type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export type SubscriptionFormResult = {
  fields: SubscriptionFormState
  setField: <K extends keyof SubscriptionFormState>(k: K, v: SubscriptionFormState[K]) => void
  submit: () => Promise<void>
  status: SubscriptionStatus
  fieldErrors: Partial<Record<keyof SubscriptionFormState, string>>
  errorMessage: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The subscribe form maps the same filter fields as the manage page, plus its own email field.
const SUBSCRIBE_FIELD_MAP: Record<string, keyof SubscriptionFormState> = {
  email: 'email',
  ...FILTER_FIELD_MAP,
}

export function useSubscriptionForm(
  initialFilters?: RecallFilterValues,
  initialCountries: RecallCountry[] = []
): SubscriptionFormResult {
  const [fields, setFields] = useState<SubscriptionFormState>({
    email: '',
    countries: initialCountries,
    entities: initialFilters?.entity ? [initialFilters.entity] : [],
    companies: initialFilters?.company ? [initialFilters.company] : [],
    categories: initialFilters?.category ? [initialFilters.category as RecallCategory] : [],
    minSeverity: (initialFilters?.severity ?? '') as SeverityLabel | '',
  })

  const [status, setStatus] = useState<SubscriptionStatus>(SubscriptionStatus.idle)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SubscriptionFormState, string>>
  >({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const setField = useCallback(
    <K extends keyof SubscriptionFormState>(k: K, v: SubscriptionFormState[K]) => {
      setFields((prev) => ({ ...prev, [k]: v }))
    },
    []
  )

  const submit = useCallback(async () => {
    // --- Local validation ---
    // Email + at least one country are required; the other filters are optional (countries-only
    // means "every recall in those countries").
    const errors: Partial<Record<keyof SubscriptionFormState, string>> = {}

    if (!EMAIL_RE.test(fields.email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    if (fields.countries.length === 0) {
      errors.countries = 'Please select at least one country'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage(null)
      return
    }

    // --- Submit ---
    setStatus(SubscriptionStatus.loading)
    setFieldErrors({})
    setErrorMessage(null)

    try {
      const res = await fetch(apiUrl(apiRoutes.subscriptions.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fields.email.trim(), ...filtersToPayload(fields) }),
      })

      if (res.status === 201 || res.status === 200) {
        setStatus(SubscriptionStatus.success)
      } else if (res.status === 422) {
        const { fields: parsedErrors, general } = await parseValidationErrors(
          res,
          SUBSCRIBE_FIELD_MAP
        )
        setFieldErrors(parsedErrors)
        // A 422 with no field-level errors (a string detail, or fields we don't map) must still
        // surface — otherwise Subscribe looks like a no-op. Field errors render inline, so leave
        // those in idle.
        if (Object.keys(parsedErrors).length === 0) {
          setStatus(SubscriptionStatus.error)
          setErrorMessage(general ?? 'Please check your selections and try again.')
        } else {
          setStatus(SubscriptionStatus.idle)
        }
      } else {
        setStatus(SubscriptionStatus.error)
        setErrorMessage(`An error occurred (${res.status})`)
      }
    } catch (err: unknown) {
      setStatus(SubscriptionStatus.error)
      setErrorMessage(
        err instanceof Error ? err.message || 'An error occurred' : 'An error occurred'
      )
    }
  }, [fields])

  return { fields, setField, submit, status, fieldErrors, errorMessage }
}
