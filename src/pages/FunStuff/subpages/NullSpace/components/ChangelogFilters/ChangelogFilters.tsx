import { useEffect, useId, useRef, useState } from 'react'
import {
  CHANGELOG_CATEGORIES,
  ChangelogCategory,
  type ChangelogFilters as Filters,
} from '../../engine/world/persistence'
import styles from './ChangelogFilters.module.scss'

type ChangelogFiltersProps = {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function ChangelogFilters({ filters, onChange }: ChangelogFiltersProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const enabledCount = Object.values(filters).filter(Boolean).length

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
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
        aria-controls={popoverId}
        onClick={() => setOpen((v) => !v)}
      >
        Filter ({enabledCount}/{CHANGELOG_CATEGORIES.length})
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={popoverId}
          className={styles.popover}
          role="group"
          aria-label="Changelog category filters"
        >
          {CHANGELOG_CATEGORIES.map(({ key, label }) => (
            <label key={key} className={styles.option}>
              <input type="checkbox" checked={filters[key]} onChange={() => toggle(key)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
