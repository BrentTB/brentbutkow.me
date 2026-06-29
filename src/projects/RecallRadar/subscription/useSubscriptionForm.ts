import { useState, useCallback } from 'react'
import type {
  RecallCategory,
  RecallCountry,
  RecallFilterValues,
  SeverityLabel,
} from '../recall.types'
import { apiRoutes, apiUrl } from '../../../api/api'

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

export type SubscriptionFormResult = {
  fields: SubscriptionFormState
  setField: <K extends keyof SubscriptionFormState>(k: K, v: SubscriptionFormState[K]) => void
  submit: () => Promise<void>
  status: 'idle' | 'loading' | 'success' | 'error'
  fieldErrors: Partial<Record<keyof SubscriptionFormState, string>>
  errorMessage: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  const [status, setStatus] = useState<SubscriptionFormResult['status']>('idle')
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
    setStatus('loading')
    setFieldErrors({})
    setErrorMessage(null)

    try {
      const res = await fetch(apiUrl(apiRoutes.subscriptions.create), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email.trim(),
          countries: fields.countries,
          entities: fields.entities,
          companies: fields.companies,
          categories: fields.categories,
          min_severity: fields.minSeverity || null,
        }),
      })

      if (res.status === 201 || res.status === 200) {
        setStatus('success')
      } else if (res.status === 422) {
        // Parse 422 body for field-level errors (FastAPI / Pydantic format)
        try {
          const body = (await res.json()) as unknown
          const parsedErrors: Partial<Record<keyof SubscriptionFormState, string>> = {}

          // Pydantic v2 format: { detail: [{ loc: ['body', 'fieldName'], msg: '...' }] }
          if (
            body !== null &&
            typeof body === 'object' &&
            'detail' in body &&
            Array.isArray((body as Record<string, unknown>).detail)
          ) {
            const detail = (body as { detail: Array<{ loc: string[]; msg: string; type: string }> })
              .detail
            for (const err of detail) {
              const loc = err.loc
              if (Array.isArray(loc) && loc.length >= 2) {
                const fieldName = loc[loc.length - 1] as string
                // Map snake_case API field names to camelCase form state keys
                const fieldMap: Record<string, keyof SubscriptionFormState> = {
                  email: 'email',
                  countries: 'countries',
                  entities: 'entities',
                  companies: 'companies',
                  categories: 'categories',
                  min_severity: 'minSeverity',
                }
                const formKey = fieldMap[fieldName]
                if (formKey) {
                  parsedErrors[formKey] = err.msg
                }
              }
            }
          }

          setFieldErrors(parsedErrors)
        } catch {
          // If body can't be parsed, just stay in idle with no field errors
        }
        setStatus('idle')
      } else {
        // Unexpected non-2xx status
        setStatus('error')
        setErrorMessage(`An error occurred (${res.status})`)
      }
    } catch (err: unknown) {
      setStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message || 'An error occurred' : 'An error occurred'
      )
    }
  }, [fields])

  return { fields, setField, submit, status, fieldErrors, errorMessage }
}
