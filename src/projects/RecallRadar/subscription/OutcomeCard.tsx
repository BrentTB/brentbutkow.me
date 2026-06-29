import type { ReactNode } from 'react'
import styles from './SubscriptionPages.module.scss'

export const OutcomeMark = { ok: 'ok', warn: 'warn' } as const
export type OutcomeMark = (typeof OutcomeMark)[keyof typeof OutcomeMark]

type OutcomeCardProps = {
  loading: boolean
  loadingText: string
  mark: string
  markVariant: OutcomeMark
  heading: string
  body: string
  // Calls-to-action (links/buttons) rendered below the body once loading resolves.
  children?: ReactNode
}

// Centered status card for the email-landing pages: a spinner-free loading line, then a status mark,
// heading, body, and any actions. Confirm and Unsubscribe share it; Manage's form differs enough to
// stay separate.
export function OutcomeCard({
  loading,
  loadingText,
  mark,
  markVariant,
  heading,
  body,
  children,
}: OutcomeCardProps) {
  if (loading) {
    return (
      <div className={styles.outcome}>
        <p className={styles.loading}>{loadingText}</p>
      </div>
    )
  }

  return (
    <div className={styles.outcome}>
      <span
        className={`${styles.mark} ${markVariant === OutcomeMark.ok ? styles.markOk : styles.markWarn}`}
        aria-hidden="true"
      >
        {mark}
      </span>
      <h2 className={styles.outcomeHeading}>{heading}</h2>
      <p className={styles.outcomeBody}>{body}</p>
      {children && <div className={styles.outcomeActions}>{children}</div>}
    </div>
  )
}
