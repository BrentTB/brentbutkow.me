import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { SelectOption } from './option.types'
import styles from './Combobox.module.scss'

type ComboboxProps = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  // Provide to drive options from a parent (e.g. a server search) as the user types; omit to filter
  // the given `options` client-side.
  onInputChange?: (query: string) => void
  // For async loaders: distinguish an in-flight fetch and a failed one from a genuine empty result,
  // so the empty dropdown reads "Searching…"/"Couldn't load options" instead of a misleading "No matches".
  loading?: boolean
  error?: boolean
  // Fix the control + dropdown to this many characters wide; longer option labels truncate with an
  // ellipsis rather than widening it. Omit to size to the input (good for short options).
  widthCh?: number
}

// A searchable dropdown (ARIA combobox): a text input that filters a listbox. Pick from the list —
// it does not accept free text as a value. Static lists filter client-side; pass `onInputChange` to
// load options asynchronously instead.
export function Combobox({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  onInputChange,
  loading,
  error,
  widthCh,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value
  // Keep the input showing the committed selection when it changes from outside.
  useEffect(() => setQuery(selectedLabel), [selectedLabel])

  // Async parents pre-filter, so trust their options; otherwise filter client-side — but show the
  // full list while the input still mirrors the current selection (nothing typed yet).
  const typed = query.trim().toLowerCase()
  const filtered =
    onInputChange || typed === '' || query === selectedLabel
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(typed))

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery(selectedLabel)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, selectedLabel])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  // After the list changes (typing refilters it, async options arrive), keep the active row on a
  // selectable option — a reset to index 0 could land on a disabled (zero-result) one, leaving
  // aria-activedescendant pointing at it. Seek the first enabled option when that happens.
  useEffect(() => {
    if (!open) return
    setActiveIndex((index) => {
      if (filtered[index] && !filtered[index].disabled) return index
      const firstEnabled = filtered.findIndex((option) => !option.disabled)
      return firstEnabled === -1 ? 0 : firstEnabled
    })
  }, [open, filtered])

  // Nearest selectable row from `start` (step `dir`); null if none, so the keyboard skips disabled
  // (zero-result) options rather than landing on them.
  const seekEnabled = (start: number, dir: number): number | null => {
    for (let i = start; i >= 0 && i < filtered.length; i += dir) {
      if (!filtered[i]?.disabled) return i
    }
    return null
  }

  const choose = (option: SelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const onType = (text: string) => {
    setQuery(text)
    setActiveIndex(0)
    setOpen(true)
    onInputChange?.(text)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selectedLabel)
    } else if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault()
      setOpen(true)
    } else if (open && event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((index) => seekEnabled(index + 1, 1) ?? index)
    } else if (open && event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => seekEnabled(index - 1, -1) ?? index)
    } else if (open && event.key === 'Enter') {
      event.preventDefault()
      if (filtered[activeIndex]) choose(filtered[activeIndex])
    }
  }

  return (
    <div
      className={styles.root}
      ref={rootRef}
      style={widthCh ? { width: `${widthCh}ch` } : undefined}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        className={styles.input}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered.length > 0 ? optionId(activeIndex) : undefined}
        placeholder={placeholder}
        value={query}
        onChange={(event) => onType(event.target.value)}
        onFocus={() => {
          setOpen(true)
          inputRef.current?.select()
        }}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label={`Clear ${ariaLabel}`}
          onClick={() => onChange('')}
        >
          ✕
        </button>
      )}
      {open && (
        <ul className={styles.menu} id={listboxId} role="listbox" aria-label={ariaLabel}>
          {filtered.length === 0 ? (
            <li className={styles.empty}>
              {loading ? 'Searching…' : error ? 'Couldn’t load options' : 'No matches'}
            </li>
          ) : (
            filtered.map((option, index) => (
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
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(option)
                }}
              >
                <span className={styles.optionLabel}>{option.label}</span>
                {option.count !== undefined && (
                  <span className={styles.count}>{option.count.toLocaleString()}</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
