import { useState } from 'react'
import { type RecallCountry, type RecallFilterValues } from '../recall.types'
import { SubscriptionForm } from './SubscriptionForm'
import styles from './SubscriptionPanel.module.scss'

type SubscriptionPanelProps = {
  // Live dashboard filters and the selected country. They are read when the panel opens (the form
  // mounts then), so opening always snapshots the current dashboard state; closing discards it.
  initialFilters?: RecallFilterValues
  country: RecallCountry
  // Suggestions for the entity input, drawn from the dashboard's live facet data.
  entityOptions?: string[]
}

export function SubscriptionPanel({
  initialFilters,
  country,
  entityOptions,
}: SubscriptionPanelProps) {
  const [open, setOpen] = useState(false)

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

      {/* Mounting on open (and unmounting on close) is what makes the form snapshot the current
          dashboard filters each time it is opened, and reset to defaults when reopened. */}
      {open && (
        <div className={styles.body}>
          <SubscriptionForm
            initialFilters={initialFilters}
            country={country}
            entityOptions={entityOptions}
          />
        </div>
      )}
    </section>
  )
}
