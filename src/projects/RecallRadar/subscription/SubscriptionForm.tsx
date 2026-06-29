import { useCallback } from 'react'
import { RecallCountry, type RecallFilterValues } from '../recall.types'
import {
  SUBSCRIPTION_DISCLAIMER,
  SubscriptionFields,
  type FilterFieldsValue,
} from './SubscriptionFields'
import { useSubscriptionForm, type SubscriptionFormState } from './useSubscriptionForm'
import styles from './SubscriptionPanel.module.scss'

type SubscriptionFormProps = {
  // Snapshotted from the dashboard when the panel opens — see SubscriptionPanel.
  initialFilters?: RecallFilterValues
  country: RecallCountry
  entityOptions?: string[]
}

export function SubscriptionForm({
  initialFilters,
  country,
  entityOptions = [],
}: SubscriptionFormProps) {
  // Pre-fill from the dashboard filters, and pre-select the country the visitor is browsing.
  const { fields, setField, submit, status, fieldErrors, errorMessage } = useSubscriptionForm(
    initialFilters,
    [country]
  )

  // SubscriptionFields edits the filter subset; email stays on this form. The wrapper keeps the
  // key→value correlation that a plain cast would lose.
  const setFilterField = useCallback(
    <K extends keyof FilterFieldsValue>(key: K, value: FilterFieldsValue[K]) =>
      setField(key, value as SubscriptionFormState[K]),
    [setField]
  )

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void submit()
  }

  if (status === 'success') {
    return (
      <p className={styles.success} role="status">
        Check your email for a link to confirm. Nothing changes until you click it.
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
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
        {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
      </label>

      <SubscriptionFields
        value={fields}
        setField={setFilterField}
        entityOptions={entityOptions}
        errors={fieldErrors}
      />

      <p className={styles.disclaimer}>{SUBSCRIPTION_DISCLAIMER}</p>

      <button type="submit" className={styles.submit} disabled={status === 'loading'}>
        {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  )
}
