import { MorphTabs, MorphTabOption } from '../../../components/MorphTabs/MorphTabs'
import { countryLabels } from '../data'
import { RecallCountry } from '../recall.types'

type LocationSelectorProps = {
  value: RecallCountry
  // When the page has scrolled, the tabs fold into a compact dropdown so the scope stays reachable
  // from the sticky bar without taking a full row.
  collapsed: boolean
  onChange: (country: RecallCountry) => void
}

// Location is the view's scope (US vs UK are separate datasets), not a filter — so it reads as a
// first-class row of tabs, morphing to a dropdown once scrolled. The morph is generic; this maps
// the country set onto it, so adding a place is a data-only change.
const LOCATION_OPTIONS: MorphTabOption<RecallCountry>[] = Object.values(RecallCountry).map(
  (country) => ({ value: country, label: countryLabels[country] })
)

export function LocationSelector({ value, collapsed, onChange }: LocationSelectorProps) {
  return (
    <MorphTabs
      options={LOCATION_OPTIONS}
      value={value}
      collapsed={collapsed}
      onChange={onChange}
      ariaLabel="Location"
    />
  )
}
