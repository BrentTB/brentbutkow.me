import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import styles from './Select.module.scss'

export type SelectOption = { value: string; label: string }

type SelectProps = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
}

// Custom dropdown — native <select> popups render OS-default (white) and can't be themed on macOS.
// Button trigger + listbox, themed to the dark site; keyboard + click-outside supported.
export function Select({ value, options, onChange, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Keep the keyboard-active option in view as it moves through a long list.
  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  const openMenu = () => {
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.value === value)
      )
    )
    setOpen(true)
  }

  const choose = (index: number) => {
    onChange(options[index].value)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      openMenu()
    } else if (open && event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(options.length - 1, index + 1))
    } else if (open && event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      choose(activeIndex)
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={styles.value}>{selected?.label ?? ''}</span>
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className={styles.menu} id={listboxId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              ref={(node) => {
                optionRefs.current[index] = node
              }}
              role="option"
              aria-selected={option.value === value}
              className={[
                styles.option,
                index === activeIndex && styles.active,
                option.value === value && styles.selected,
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
