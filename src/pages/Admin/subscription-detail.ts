import { regionName } from '../../projects/RecallRadar/region-names'
import { RecallCountry } from '../../projects/RecallRadar/recall.types'
import { SubscriptionAdminOut } from './admin.types'
import { formatDateTime, joinList } from './admin-format'

export type DetailField = { label: string; value: string }

// The read-only fields shown under a subscription row in the admin panel. Pure (no JSX) so the
// display logic — notably the EU member-state narrowing — is unit-testable without rendering the
// whole data-fetching panel.
export function subscriptionDetailFields(subscription: SubscriptionAdminOut): DetailField[] {
  const affectedCountries = subscription.affectedCountries ?? []
  return [
    // EU member-state narrowing — only meaningful for an EU subscription. Empty = every EU recall.
    // Shown as country names (regionName), matching the subscriber form and the map.
    ...(subscription.countries.includes(RecallCountry.eu)
      ? [
          {
            label: 'EU countries',
            value: affectedCountries.length
              ? affectedCountries.map(regionName).join(', ')
              : 'All EU countries',
          },
        ]
      : []),
    { label: 'Entities', value: joinList(subscription.entities) },
    { label: 'Companies', value: joinList(subscription.companies) },
    { label: 'Confirmed', value: formatDateTime(subscription.confirmedAt) },
    { label: 'Updated', value: formatDateTime(subscription.updatedAt) },
    { label: 'Last digest', value: formatDateTime(subscription.lastDigestAt) },
  ]
}
