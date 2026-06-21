import { useState } from 'react'
import { Select } from '../../../components/inputs/Select'
import type { SelectOption } from '../../../components/inputs/option.types'
import type { EventOut } from '../recall.types'
import { formatDate } from '../chart-format'
import styles from './Outbreaks.module.scss'

type OutbreaksProps = {
  events: EventOut[]
  activeEvent: string
  onSelect: (slug: string) => void
}

// Show at most this many outbreak cards — the headline incidents, not an exhaustive list.
const MAX_OUTBREAKS = 8

// Recent matters more day-to-day, so it's the default; Biggest surfaces the all-time largest.
type SortMode = 'recent' | 'biggest'
const SORT_OPTIONS: SelectOption[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'biggest', label: 'Biggest' },
]

// The high-signal clusters (pathogen-driven, multi-recall) as clickable cards. Clicking one filters
// the recall list + trend to that incident's recalls (its stable slug rides the URL).
export function Outbreaks({ events, activeEvent, onSelect }: OutbreaksProps) {
  const [mode, setMode] = useState<SortMode>('recent')
  const outbreaks = events.filter((event) => event.isOutbreak)
  if (outbreaks.length === 0) return null
  // Recent = latest member report date first; Biggest = most recalls first (ISO dates sort lexically).
  const shown = [...outbreaks]
    .sort((a, b) =>
      mode === 'recent'
        ? (b.lastDate ?? '').localeCompare(a.lastDate ?? '')
        : b.recallCount - a.recallCount
    )
    .slice(0, MAX_OUTBREAKS)
  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <Select
          ariaLabel="Sort outbreaks"
          value={mode}
          options={SORT_OPTIONS}
          onChange={(value) => setMode(value === 'biggest' ? 'biggest' : 'recent')}
        />
      </div>
      <ul className={styles.grid}>
        {shown.map((event) => {
          const active = event.slug === activeEvent
          const span =
            event.firstDate && event.lastDate
              ? `${formatDate(event.firstDate)} – ${formatDate(event.lastDate)}`
              : null
          const companies = `${event.companyCount} ${event.companyCount === 1 ? 'company' : 'companies'}`
          return (
            <li key={event.slug}>
              <button
                type="button"
                className={`${styles.card} ${active ? styles.active : ''}`}
                aria-pressed={active}
                aria-label={`Filter to the ${event.dominantEntity ?? 'outbreak'} outbreak`}
                title="Filter to this outbreak"
                onClick={() => onSelect(active ? '' : event.slug)}
              >
                <span className={styles.head}>
                  <span className={styles.entity}>{event.dominantEntity ?? 'Outbreak'}</span>
                  <span className={styles.count}>{event.recallCount} recalls</span>
                </span>
                <span className={styles.meta}>
                  {companies}
                  {event.stateCount > 0 ? ` · ${event.stateCount} states` : ''}
                </span>
                {span && <span className={styles.span}>{span}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
