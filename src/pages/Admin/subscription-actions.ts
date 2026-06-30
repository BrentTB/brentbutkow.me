import { SubscriptionAdminStatus } from './admin.types'

// An operator-driven status change offered on a subscription row.
export type StatusAction = {
  to: SubscriptionAdminStatus
  label: string
  // Reviving a deliberate opt-out is consent-sensitive — confirm before sending.
  confirm: boolean
}

// Status changes an operator may trigger from a row. `pending_confirmation` offers none — only the
// subscriber can confirm their own email. Reactivating an `unsubscribed` row is gated behind a
// confirm because they opted out on purpose; the backend permits it but the intent check lives here.
export function statusActions(status: SubscriptionAdminStatus): StatusAction[] {
  switch (status) {
    case SubscriptionAdminStatus.active:
      return [{ to: SubscriptionAdminStatus.paused, label: 'Pause', confirm: false }]
    case SubscriptionAdminStatus.paused:
      return [{ to: SubscriptionAdminStatus.active, label: 'Reactivate', confirm: false }]
    case SubscriptionAdminStatus.unsubscribed:
      return [{ to: SubscriptionAdminStatus.active, label: 'Reactivate', confirm: true }]
    default:
      return []
  }
}
