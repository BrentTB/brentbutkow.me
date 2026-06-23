import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { SelectOption } from './option.types'
import styles from './Select.module.scss'

type SelectProps = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  // Optional extra class on the trigger button, to restyle it for a host control (e.g. blended into
  // the year stepper's pill). The dropdown menu itself is unaffected.
  triggerClassName?: string
}

// Custom dropdown — native <select> popups render OS-default (white) and can't be themed on macOS.
// Button trigger + listbox, themed to the dark site; keyboard + click-outside supported. Options may
// carry a faceted `count` (shown muted) and a `disabled` flag (greyed, skipped by keyboard + clicks).
export function Select({ value, options, onChange, ariaLabel, triggerClassName }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const selected = options.find((option) => option.value === value) ?? options[0]

  // The nearest selectable option from `start`, stepping by `dir` (+1/-1); null if none that way, so
  // the keyboard never lands on a disabled (zero-result) option.
  const seekEnabled = (start: number, dir: number): number | null => {
    for (let i = start; i >= 0 && i < options.length; i += dir) {
      if (!options[i]?.disabled) return i
    }
    return null
  }

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
    const current = options.findIndex((option) => option.value === value)
    // Land on the selected option, or the first selectable one if it's missing/disabled.
    setActiveIndex(current >= 0 && !options[current]?.disabled ? current : (seekEnabled(0, 1) ?? 0))
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
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
      setActiveIndex((index) => seekEnabled(index + 1, 1) ?? index)
    } else if (open && event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => seekEnabled(index - 1, -1) ?? index)
    } else if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      choose(activeIndex)
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={[styles.trigger, triggerClassName].filter(Boolean).join(' ')}
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
              aria-disabled={option.disabled || undefined}
              className={[
                styles.option,
                index === activeIndex && styles.active,
                option.value === value && styles.selected,
                option.disabled && styles.disabled,
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              {option.count !== undefined && (
                <span className={styles.count}>{option.count.toLocaleString()}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
