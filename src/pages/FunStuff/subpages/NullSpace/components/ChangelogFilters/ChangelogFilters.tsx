import { useEffect, useRef, useState } from 'react'
import { ChangelogCategory, type ChangelogFilters as Filters } from '../../engine/world/persistence'
import styles from './ChangelogFilters.module.scss'

const CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  [ChangelogCategory.breaking]: 'Breaking',
  [ChangelogCategory.features]: 'Features',
  [ChangelogCategory.balance]: 'Balance',
  [ChangelogCategory.fixes]: 'Fixes',
  [ChangelogCategory.ui]: 'User Interface',
  [ChangelogCategory.architecture]: 'Internal Architecture',
}

const CATEGORY_ORDER: ChangelogCategory[] = [
  ChangelogCategory.breaking,
  ChangelogCategory.features,
  ChangelogCategory.balance,
  ChangelogCategory.fixes,
  ChangelogCategory.ui,
  ChangelogCategory.architecture,
]

type ChangelogFiltersProps = {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function ChangelogFilters({ filters, onChange }: ChangelogFiltersProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const enabledCount = Object.values(filters).filter(Boolean).length

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const toggle = (category: ChangelogCategory) => {
    onChange({ ...filters, [category]: !filters[category] })
  }

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Filter ({enabledCount}/{CATEGORY_ORDER.length})
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.popover} role="group" aria-label="Changelog category filters">
          {CATEGORY_ORDER.map((category) => (
            <label key={category} className={styles.option}>
              <input
                type="checkbox"
                checked={filters[category]}
                onChange={() => toggle(category)}
              />
              <span>{CATEGORY_LABELS[category]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
