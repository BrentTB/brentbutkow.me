import styles from './ShowMoreToggle.module.scss'

type ShowMoreToggleProps = {
  expanded: boolean
  onToggle: () => void
  // Layout tweaks (margin/alignment) from the host module; the button's own look is fixed here.
  className?: string
}

// The "Show more / Show fewer" text button shared by the collapsible lists (outbreaks, trend
// callouts). Owns the label + aria-expanded state so both lists read and behave the same.
export function ShowMoreToggle({ expanded, onToggle, className }: ShowMoreToggleProps) {
  return (
    <button
      type="button"
      className={[styles.toggle, className].filter(Boolean).join(' ')}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {expanded ? 'Show fewer' : 'Show more'}
    </button>
  )
}
