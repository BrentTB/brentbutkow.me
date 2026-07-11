import {
  isRecallCategory,
  isRecallCountry,
  isSeverityLabel,
} from '../../projects/RecallRadar/recall.types'
import type { FilterFieldsValue } from '../../projects/RecallRadar/subscription/SubscriptionFields'
import { isAffectedCountryCode } from '../../projects/RecallRadar/eu-country-grid'
import { SubscriptionAdminOut } from './admin.types'

// Admin subscriptions store the same filter fields as plain strings. Validate each against the
// RecallRadar guards before feeding them to the shared SubscriptionFields form, so a stale or
// foreign value can't slip into form state. Unknown countries/categories/affected-codes drop; an
// unknown severity falls back to "any". `affectedCountries` may be absent on rows predating the column.
export function toFilterFields(subscription: SubscriptionAdminOut): FilterFieldsValue {
  return {
    countries: subscription.countries.filter(isRecallCountry),
    affectedCountries: (subscription.affectedCountries ?? []).filter(isAffectedCountryCode),
    entities: subscription.entities,
    companies: subscription.companies,
    categories: subscription.categories.filter(isRecallCategory),
    minSeverity: isSeverityLabel(subscription.minSeverity) ? subscription.minSeverity : '',
  }
}
