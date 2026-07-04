import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './MorphTabs.module.scss'

export type MorphTabOption<T extends string> = {
  value: T
  label: string
}

type MorphTabsProps<T extends string> = {
  options: MorphTabOption<T>[]
  value: T
  // When true, the tabs fold into a compact dropdown so the choice stays reachable without a full
  // row. The parent owns the trigger for collapsing (scroll position, viewport width, …).
  collapsed: boolean
  onChange: (value: T) => void
  // Names the choice for assistive tech — the expanded group and the portaled menu (e.g. 'Location').
  ariaLabel: string
  // The collapsed trigger's accessible name, built from the active option's label. Defaults to
  // `${ariaLabel}: ${label}` (e.g. 'Location: United States').
  triggerLabel?: (label: string) => string
}

// A segmented row of tabs that morphs into a dropdown when `collapsed`: the inactive tabs fold to
// zero width and the active one stays in place as the trigger, its caret sliding in. Both forms are
// one persistent element iterating the same options, so the swap animates as a morph rather than one
// control replacing another — and adding an option is a data-only change. Timing and the
// active-highlight fade live in the stylesheet.
export function MorphTabs<T extends string>({
  options,
  value,
  collapsed,
  onChange,
  ariaLabel,
  triggerLabel = (label) => `${ariaLabel}: ${label}`,
}: MorphTabsProps<T>) {
  const [open, setOpen] = useState(false)
  // Anchor coords for the portaled menu; null until measured so it never flashes at the origin.
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  // Suppresses transitions for one frame. Changing the value while collapsed moves the trigger role
  // to another tab — without this, the old tab folds while the new one unfolds and the two racing
  // width animations balloon the control. The collapse/expand morph itself still animates.
  const [snap, setSnap] = useState(false)
  const prevValue = useRef(value)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // A collapsed parent may clip its overflow (e.g. a sticky bar that scrolls its contents), so an
  // in-flow dropdown would be cut off. Portal the menu to the body and pin it under the trigger.
  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 8
    const menuWidth = menuRef.current?.offsetWidth ?? 180
    const top = rect.bottom + 6
    // Align the menu's left edge to the trigger, then clamp it inside the viewport. Anchoring by the
    // right edge pushes the menu off-screen when the trigger sits near the left edge; clamping keeps
    // a right-docked trigger on screen too.
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin))
    // Bail when the anchor hasn't moved so a scroll storm doesn't re-render every frame.
    setCoords((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  // The trigger can re-pin as the page scrolls or resizes, so track it while open.
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

  // Expanding should never leave the menu hanging open.
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
      aria-label={collapsed ? undefined : ariaLabel}
    >
      {options.map(({ value: optionValue, label }) => {
        const active = optionValue === value
        const isTrigger = collapsed && active
        const isFolded = collapsed && !active
        return (
          <button
            key={optionValue}
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
            aria-label={isTrigger ? triggerLabel(label) : undefined}
            onClick={() => {
              if (isTrigger) setOpen((prev) => !prev)
              else onChange(optionValue)
            }}
          >
            {label}
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
            aria-label={ariaLabel}
            style={{ top: coords.top, left: coords.left }}
          >
            {options.map(({ value: optionValue, label }) => (
              <button
                key={optionValue}
                type="button"
                aria-current={optionValue === value ? 'true' : undefined}
                className={`${styles.item} ${optionValue === value ? styles.itemActive : ''}`}
                onClick={() => {
                  onChange(optionValue)
                  setOpen(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
