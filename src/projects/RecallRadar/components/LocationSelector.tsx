import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
// first-class choice. Expanded, it's a row of tabs; collapsed, a top-right dropdown. Both
// forms iterate the same list, so adding a place is a data-only change.
export function LocationSelector({ value, collapsed, onChange }: LocationSelectorProps) {
  const [open, setOpen] = useState(false)
  // Anchor coords for the portaled menu; null until measured so it never flashes at the origin.
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // The sticky control bar clips its overflow on phones (the filters scroll inside it), so an
  // in-flow dropdown would be cut off. Portal the menu to the body and pin it under the trigger.
  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  // The bar re-pins as the page scrolls / navbar retracts, so track the trigger while open.
  useEffect(() => {
    if (!open) return
    const reposition = () => place()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  // Collapsing on scroll should never leave the menu hanging open.
  useEffect(() => {
    if (!collapsed) setOpen(false)
  }, [collapsed])

  // Dismiss on outside click or Escape, like the app's other popovers.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
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
    <div key="dropdown" className={styles.dropdown}>
      <button
        ref={triggerRef}
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
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="group"
            aria-label="Location"
            style={{ top: coords.top, right: coords.right }}
          >
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
          </div>,
          document.body
        )}
    </div>
  )
}
