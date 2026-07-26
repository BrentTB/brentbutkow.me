import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { SelectOption } from './option.types'
import { portalTarget } from './portalTarget'
import { useAnchoredPosition } from './useAnchoredPosition'
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
  // Chip-input mode: the typed text is itself a committable value. Enter, comma, and blur commit
  // the trimmed draft via onChange and clear the input; picking a suggestion commits the same way.
  // Pass `value=""` so each commit reads as a fresh entry rather than a selection.
  freeText?: boolean
  // Chip-input hook: Backspace on an empty input (remove the last chip).
  onBackspaceEmpty?: () => void
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
  freeText,
  onBackspaceEmpty,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
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

  // The listbox is portaled to <body> (fixed-positioned) so it escapes any overflow/backdrop-filter
  // ancestor that would clip it (e.g. the dashboard's scrollable sticky bar). Re-flow on the filtered
  // count so a flipped-up menu repositions when async options change its height.
  const coords = useAnchoredPosition(rootRef, menuRef, open, filtered.length)

  // Reset the input to the committed selection on close, and tell an async parent to do the same —
  // otherwise a half-typed query (e.g. "wal") keeps driving suggestions the next time it opens, even
  // though the input shows nothing typed.
  const resetToSelection = () => {
    setQuery(selectedLabel)
    onInputChange?.(selectedLabel)
  }

  // Arrow keys signal intent to pick from the list; typing reclaims Enter for the raw draft.
  const navigatedRef = useRef(false)

  // Chip mode: hand the trimmed draft to the parent and clear for the next entry. Read the live input
  // value, not `query` state — a fast type-then-commit (comma/Enter/blur) can fire before that state
  // commits, which would drop the last character. Closes the menu so all commit paths behave alike.
  const commitDraft = () => {
    const draft = (inputRef.current?.value ?? '').trim()
    setQuery('')
    navigatedRef.current = false
    setOpen(false)
    if (draft) onChange(draft)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      // The listbox lives in a body portal, outside rootRef — don't treat a click on it as "outside".
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
      // Chip mode commits on blur (which this click also triggers) — committing here too would
      // hand the parent the same draft twice.
      if (!freeText) resetToSelection()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
    // resetToSelection closes over selectedLabel/onInputChange; re-bind when the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Clear the typed draft when the pick isn't a persistent selection: freeText chip mode, or an
    // "add to a list" combobox whose parent holds `value=""` (each pick becomes a chip elsewhere).
    // For a normal single-select the `setQuery(selectedLabel)` effect restores the label once
    // `value` changes; without this, a list-add combobox (value stays "") would keep "Ger" in the
    // box because selectedLabel never changes.
    if (freeText || value === '') setQuery('')
    navigatedRef.current = false
    setOpen(false)
  }

  const onType = (text: string) => {
    setQuery(text)
    setActiveIndex(0)
    navigatedRef.current = false
    setOpen(true)
    onInputChange?.(text)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      resetToSelection()
    } else if (freeText && event.key === 'Enter') {
      // Prefer a real option, so Enter autocompletes ("peanu" → "peanuts") instead of saving the
      // partial draft — the options are a known set worth snapping to. Match against the `options`
      // prop directly, not the `filtered`/`query` state, which a fast type-then-Enter can outrun. An
      // arrowed pick wins; otherwise the first option containing the draft; else the raw draft.
      // `choose` commits the pick and `commitDraft` the raw draft, so Enter/comma/blur stay in sync.
      // Comma stays a literal commit — the escape hatch for a value that's a substring of an option.
      event.preventDefault()
      const draft = (inputRef.current?.value ?? '').trim()
      if (!draft) return
      const arrowed = navigatedRef.current && filtered[activeIndex] ? filtered[activeIndex] : null
      const suggestion =
        arrowed ??
        options.find((o) => !o.disabled && o.label.toLowerCase().includes(draft.toLowerCase()))
      if (suggestion) choose(suggestion)
      else commitDraft()
    } else if (freeText && event.key === ',') {
      event.preventDefault()
      commitDraft()
    } else if (freeText && event.key === 'Backspace' && query === '') {
      onBackspaceEmpty?.()
    } else if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault()
      setOpen(true)
    } else if (open && event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length === 0) return
      navigatedRef.current = true
      setActiveIndex((index) => seekEnabled(index + 1, 1) ?? index)
    } else if (open && event.key === 'ArrowUp') {
      event.preventDefault()
      navigatedRef.current = true
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
          inputRef.current?.select()
        }}
        onClick={() => setOpen(!open)}
        // Chip mode: tabbing/tapping away commits the draft. Picking an option never blurs
        // mid-click — the menu preventDefaults its own mousedown.
        onBlur={freeText ? commitDraft : undefined}
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
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className={styles.menu}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={
              coords
                ? {
                    position: 'fixed',
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    minWidth: coords.width,
                  }
                : { position: 'fixed', visibility: 'hidden' }
            }
          >
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
          </ul>,
          portalTarget()
        )}
    </div>
  )
}
