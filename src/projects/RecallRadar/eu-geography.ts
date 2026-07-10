import { regionName } from './region-names'
import type { Recall } from './recall.types'

// The EU/RASFF geography facts — notifying member state plus origin / distribution country lists —
// resolved to display names. The fields are null on every other source, so the list is empty for
// non-EU recalls. Shared by the feed's drill-down rows and the detail page's facts.
export function euGeographyRows(
  recall: Pick<Recall, 'notifyingCountry' | 'originCountries' | 'distributionCountries'>
): { term: string; value: string }[] {
  const rows: { term: string; value: string }[] = []
  if (recall.notifyingCountry) {
    rows.push({ term: 'Notified by', value: regionName(recall.notifyingCountry) })
  }
  if (recall.originCountries?.length) {
    rows.push({ term: 'Origin', value: recall.originCountries.map(regionName).join(', ') })
  }
  if (recall.distributionCountries?.length) {
    rows.push({
      term: 'Distributed to',
      value: recall.distributionCountries.map(regionName).join(', '),
    })
  }
  return rows
}
