import {
  isRecallCategory,
  isRecallCountry,
  isSeverityLabel,
} from '../../projects/RecallRadar/recall.types'
import type { FilterFieldsValue } from '../../projects/RecallRadar/subscription/SubscriptionFields'
import { SubscriptionAdminOut } from './admin.types'

// Admin subscriptions store the same filter fields as plain strings. Validate each against the
// RecallRadar guards before feeding them to the shared SubscriptionFields form, so a stale or
// foreign value can't slip into form state. Unknown countries/categories drop; an unknown severity
// falls back to "any".
export function toFilterFields(subscription: SubscriptionAdminOut): FilterFieldsValue {
  return {
    countries: subscription.countries.filter(isRecallCountry),
    entities: subscription.entities,
    companies: subscription.companies,
    categories: subscription.categories.filter(isRecallCategory),
    minSeverity: isSeverityLabel(subscription.minSeverity) ? subscription.minSeverity : '',
  }
}
