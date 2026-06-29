import { useCallback, useEffect, useRef, useState } from 'react'
import { RecallCountry, type RecallFilterValues } from '../recall.types'
import {
  SUBSCRIPTION_DISCLAIMER,
  SubscriptionFields,
  type FilterFieldsValue,
} from './SubscriptionFields'
import { useGeo } from './useGeo'
import { useSubscriptionForm, type SubscriptionFormState } from './useSubscriptionForm'
import styles from './SubscriptionPanel.module.scss'

const ALL_COUNTRIES = Object.values(RecallCountry)

type SubscriptionPanelProps = {
  // Active dashboard filters and the selected country. When any filter that maps to an alert
  // criterion is set, the form opens pre-populated from them; otherwise it falls back to geo.
  initialFilters?: RecallFilterValues
  country: RecallCountry
  // Suggestions for the entity input, drawn from the dashboard's live facet data.
  entityOptions?: string[]
}

export function SubscriptionPanel({
  initialFilters,
  country,
  entityOptions = [],
}: SubscriptionPanelProps) {
  const hasActiveFilters = Boolean(
    initialFilters &&
    (initialFilters.entity ||
      initialFilters.company ||
      initialFilters.category ||
      initialFilters.severity)
  )
  const { fields, setField, submit, status, fieldErrors, errorMessage } = useSubscriptionForm(
    hasActiveFilters ? initialFilters : undefined
  )
  const geo = useGeo()

  const [open, setOpen] = useState(false)
  const countriesTouched = useRef(false)
  const initedCountries = useRef(false)

  // Seed the country selection once: from the dashboard's country when filters are active, else all
  // three until geo narrows it.
  useEffect(() => {
    if (initedCountries.current) return
    initedCountries.current = true
    setField('countries', hasActiveFilters ? [country] : ALL_COUNTRIES)
  }, [hasActiveFilters, country, setField])

  // Narrow to the detected country when nothing is pre-filled and the user hasn't picked yet.
  useEffect(() => {
    if (!hasActiveFilters && geo && !countriesTouched.current) setField('countries', [geo])
  }, [geo, hasActiveFilters, setField])

  // SubscriptionFields edits the filter subset; email stays on this form. The wrapper keeps the
  // key→value correlation that a plain cast would lose.
  const setFilterField = useCallback(
    <K extends keyof FilterFieldsValue>(key: K, value: FilterFieldsValue[K]) =>
      // FilterFieldsValue is a subset of the form state with identical value types, so the keys and
      // values line up; the cast only bridges the two indexed-type parameters.
      setField(key, value as SubscriptionFormState[K]),
    [setField]
  )

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void submit()
  }

  return (
    <section className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.toggleIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor">
            <path d="M4 6h16v12H4z" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="m4 7 8 6 8-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.toggleText}>
          <span className={styles.toggleTitle}>Get recall alerts by email</span>
          <span className={styles.toggleHint}>
            A daily digest when new recalls match your filters
          </span>
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          {status === 'success' ? (
            <p className={styles.success} role="status">
              Check your email — we’ve sent a confirmation link.
            </p>
          ) : (
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              {status === 'duplicate' && (
                <p className={styles.notice} role="status">
                  You already have an active subscription with these criteria.
                </p>
              )}
              {status === 'error' && errorMessage && (
                <p className={styles.error} role="alert">
                  {errorMessage}
                </p>
              )}

              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  type="email"
                  className={styles.input}
                  value={fields.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                )}
              </label>

              <SubscriptionFields
                value={fields}
                setField={setFilterField}
                entityOptions={entityOptions}
                errors={fieldErrors}
                onCountriesUserChange={() => {
                  countriesTouched.current = true
                }}
              />

              <p className={styles.disclaimer}>{SUBSCRIPTION_DISCLAIMER}</p>

              <button type="submit" className={styles.submit} disabled={status === 'loading'}>
                {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
