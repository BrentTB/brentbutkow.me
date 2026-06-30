import { FormEvent, useState } from 'react'
import {
  SubscriptionFields,
  type FilterFieldsValue,
} from '../../../projects/RecallRadar/subscription/SubscriptionFields'
import {
  filtersToPayload,
  type FilterPayload,
} from '../../../projects/RecallRadar/subscription/subscription-api'
import { SubscriptionAdminOut } from '../admin.types'
import { toFilterFields } from '../subscription-edit'
import styles from './Panel.module.scss'

type SubscriptionEditFormProps = {
  subscription: SubscriptionAdminOut
  entityOptions: string[]
  pending: boolean
  error: string | null
  onCancel: () => void
  onSave: (payload: FilterPayload) => void
}

// Reuses the public subscription form, so the admin gets the same country/category pickers, entity
// autocomplete, and server-backed company type-ahead instead of bespoke inputs.
export function SubscriptionEditForm({
  subscription,
  entityOptions,
  pending,
  error,
  onCancel,
  onSave,
}: SubscriptionEditFormProps) {
  const [value, setValue] = useState<FilterFieldsValue>(() => toFilterFields(subscription))

  function setField<K extends keyof FilterFieldsValue>(key: K, fieldValue: FilterFieldsValue[K]) {
    setValue((prev) => ({ ...prev, [key]: fieldValue }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    onSave(filtersToPayload(value))
  }

  return (
    <form className={styles.editForm} onSubmit={submit} noValidate>
      <SubscriptionFields value={value} setField={setField} entityOptions={entityOptions} />
      <div className={styles.actions}>
        <button type="submit" className={styles.action} disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className={styles.action} disabled={pending} onClick={onCancel}>
          Cancel
        </button>
      </div>
      {error && (
        <p className={styles.actionError} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
