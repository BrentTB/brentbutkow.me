import { useEffect, useRef, useState } from 'react'
import { countryLabels } from '../data'
import { RecallCountry } from '../recall.types'
import styles from './LocationSelector.module.scss'

type LocationSelectorProps = {
  value: RecallCountry
  // When the page has scrolled, the tabs tuck into a compact dropdown so the scope stays reachable
  // from the sticky bar without taking a full row.
  collapsed: boolean
  onChange: (country: RecallCountry) => void
}

const LOCATIONS = Object.values(RecallCountry)

// Location is the view's scope (US vs UK are separate datasets), not a filter — so it reads as a
// first-class choice. Expanded, it's a row of flagged tabs; collapsed, a top-right dropdown. Both
// forms iterate the same list, so adding a place is a data-only change.
export function LocationSelector({ value, collapsed, onChange }: LocationSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Collapsing on scroll should never leave the menu hanging open.
  useEffect(() => {
    if (!collapsed) setOpen(false)
  }, [collapsed])

  // Dismiss on outside click or Escape, like the app's other popovers.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!collapsed) {
    return (
      // Distinct keys on the two forms so collapsing remounts (rather than reusing) the element —
      // that guarantees the fade-in animation fires on the swap, not just a silent class change.
      <div key="tabs" className={styles.tabs} role="group" aria-label="Location">
        {LOCATIONS.map((country) => (
          <button
            key={country}
            type="button"
            className={`${styles.tab} ${country === value ? styles.active : ''}`}
            onClick={() => onChange(country)}
            aria-pressed={country === value}
          >
            {countryLabels[country]}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div key="dropdown" className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Location: ${countryLabels[value]}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerLabel}>{countryLabels[value]}</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.menu} role="group" aria-label="Location">
          {LOCATIONS.map((country) => (
            <button
              key={country}
              type="button"
              aria-current={country === value ? 'true' : undefined}
              className={`${styles.item} ${country === value ? styles.itemActive : ''}`}
              onClick={() => {
                onChange(country)
                setOpen(false)
              }}
            >
              {countryLabels[country]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
