import { countryLabels } from '../data'
import { RecallCountry } from '../recall.types'
import styles from './CountrySelector.module.scss'

type CountrySelectorProps = {
  value: RecallCountry
  onChange: (country: RecallCountry) => void
}

// US and UK are shown as separate views — this picks which one.
export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  return (
    <div className={styles.selector} role="group" aria-label="Country">
      {Object.values(RecallCountry).map((country) => (
        <button
          key={country}
          type="button"
          className={`${styles.option} ${country === value ? styles.active : ''}`}
          onClick={() => onChange(country)}
          aria-pressed={country === value}
        >
          {countryLabels[country]}
        </button>
      ))}
    </div>
  )
}
