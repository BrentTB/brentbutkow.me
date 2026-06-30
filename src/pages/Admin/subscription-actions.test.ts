import { describe, expect, it } from 'vitest'
import { SubscriptionAdminStatus } from './admin.types'
import { statusActions } from './subscription-actions'

describe('statusActions', () => {
  it('offers Pause for an active subscription', () => {
    expect(statusActions(SubscriptionAdminStatus.active)).toEqual([
      { to: SubscriptionAdminStatus.paused, label: 'Pause', confirm: false },
    ])
  })

  it('offers an unconfirmed Reactivate for a paused subscription', () => {
    expect(statusActions(SubscriptionAdminStatus.paused)).toEqual([
      { to: SubscriptionAdminStatus.active, label: 'Reactivate', confirm: false },
    ])
  })

  it('gates reviving an unsubscribed (opted-out) subscriber behind a confirm', () => {
    expect(statusActions(SubscriptionAdminStatus.unsubscribed)).toEqual([
      { to: SubscriptionAdminStatus.active, label: 'Reactivate', confirm: true },
    ])
  })

  it('offers no operator action while a subscription is pending confirmation', () => {
    expect(statusActions(SubscriptionAdminStatus.pendingConfirmation)).toEqual([])
  })
})
