import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { countryLabels } from '../data'
import { RecallCountry } from '../recall.types'
import styles from './LocationSelector.module.scss'

type LocationSelectorProps = {
  value: RecallCountry
  // When the page has scrolled, the tabs fold into a compact dropdown so the scope stays reachable
  // from the sticky bar without taking a full row.
  collapsed: boolean
  onChange: (country: RecallCountry) => void
}

const LOCATIONS = Object.values(RecallCountry)

// Location is the view's scope (US vs UK are separate datasets), not a filter — so it reads as a
// first-class choice. One persistent element renders both forms: expanded it's a row of tabs;
// collapsed, the inactive tabs shrink away and the active one becomes the dropdown trigger, so the
// swap animates as a morph instead of one control replacing another. Both forms iterate the same
// list, so adding a place is a data-only change.
export function LocationSelector({ value, collapsed, onChange }: LocationSelectorProps) {
  const [open, setOpen] = useState(false)
  // Anchor coords for the portaled menu; null until measured so it never flashes at the origin.
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  // Suppresses transitions for one frame. Changing the country while collapsed moves the trigger
  // role to another tab — without this, the old tab folds while the new one unfolds and the two
  // racing width animations balloon the control. The collapse/expand morph itself still animates.
  const [snap, setSnap] = useState(false)
  const prevValue = useRef(value)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // The sticky control bar clips its overflow on phones (the filters scroll inside it), so an
  // in-flow dropdown would be cut off. Portal the menu to the body and pin it under the trigger.
  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 8
    const menuWidth = menuRef.current?.offsetWidth ?? 180
    const top = rect.bottom + 6
    // Align the menu's left edge to the trigger, then clamp it inside the viewport. Anchoring by the
    // right edge pushed the menu off-screen when the trigger sits near the left (the Recalls tab on
    // phones); clamping keeps a right-docked trigger (the scrolled sticky bar) on screen too.
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin))
    // Bail when the anchor hasn't moved so a scroll storm doesn't re-render every frame.
    setCoords((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
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

  // Expanding on scroll-up should never leave the menu hanging open.
  useEffect(() => {
    if (!collapsed) setOpen(false)
  }, [collapsed])

  // Layout effect so the no-transition class is on before the width swap paints.
  useLayoutEffect(() => {
    if (prevValue.current === value) return
    prevValue.current = value
    if (collapsed) setSnap(true)
  }, [value, collapsed])

  // Restore transitions the frame after the swap has painted at its final widths.
  useEffect(() => {
    if (!snap) return
    const frame = requestAnimationFrame(() => setSnap(false))
    return () => cancelAnimationFrame(frame)
  }, [snap])

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

  return (
    <div
      className={`${styles.selector} ${collapsed ? styles.collapsed : ''} ${snap ? styles.snap : ''}`}
      // Only the expanded form is a group of choices; collapsed, the lone visible button is the
      // whole control and the group role would just be noise (the portaled menu carries its own).
      role={collapsed ? undefined : 'group'}
      aria-label={collapsed ? undefined : 'Location'}
    >
      {LOCATIONS.map((country) => {
        const active = country === value
        const isTrigger = collapsed && active
        const isFolded = collapsed && !active
        return (
          <button
            key={country}
            ref={active ? triggerRef : undefined}
            type="button"
            className={`${styles.tab} ${active ? styles.active : ''}`}
            // Folded tabs stay mounted so the width transition can run, but leave the a11y tree
            // and tab order — a screen reader should only meet the trigger.
            aria-hidden={isFolded || undefined}
            tabIndex={isFolded ? -1 : undefined}
            aria-pressed={collapsed ? undefined : active}
            aria-haspopup={isTrigger ? 'true' : undefined}
            aria-expanded={isTrigger ? open : undefined}
            aria-label={isTrigger ? `Location: ${countryLabels[country]}` : undefined}
            onClick={() => {
              if (isTrigger) setOpen((prev) => !prev)
              else onChange(country)
            }}
          >
            {countryLabels[country]}
            {active && (
              <span className={styles.caret} aria-hidden="true">
                ▾
              </span>
            )}
          </button>
        )
      })}
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="group"
            aria-label="Location"
            style={{ top: coords.top, left: coords.left }}
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
