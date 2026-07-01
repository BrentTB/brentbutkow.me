import { useRef, type KeyboardEvent } from 'react'
import styles from './ViewTabs.module.scss'

type ViewTabsProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  // The id of the region these tabs switch — set as aria-controls so assistive tech ties the tabs to
  // their panel.
  panelId: string
}

// Page-level tabs styled as an underlined rail (the site's tab idiom), distinct from the pill
// SegmentedToggle used for filters/sorts — so they read as "which view", not "another filter".
// Full tablist semantics: roving tabIndex + arrow-key navigation between tabs.
export function ViewTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  panelId,
}: ViewTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const activeIndex = options.findIndex((option) => option.value === value)

  const select = (index: number) => {
    onChange(options[index].value)
    refs.current[index]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      event.preventDefault()
      select(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      select(options.length - 1)
      return
    }
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    select((activeIndex + step + options.length) % options.length)
  }

  return (
    <div className={styles.tabs} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${option.value}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.on : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
