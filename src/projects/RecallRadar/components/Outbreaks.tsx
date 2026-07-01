import { useState } from 'react'
import { EventSort, type EventOut } from '../recall.types'
import { formatDate, pluralize } from '../chart-format'
import { SegmentedToggle } from '../../../components/inputs/SegmentedToggle'
import { useIsMobile } from '../useIsMobile'
import { ShowMoreToggle } from './ShowMoreToggle'
import styles from './Outbreaks.module.scss'

type OutbreaksProps = {
  events: EventOut[]
  activeEvent: string
  onSelect: (slug: string) => void
  // The card ordering is owned by the page as a URL param, so it persists + shares like every other
  // view config (recent matters most day-to-day; biggest surfaces the all-time largest).
  sort: EventSort
  onSortChange: (value: EventSort) => void
}

// Show at most this many outbreak cards — the headline incidents, not an exhaustive list.
const MAX_OUTBREAKS = 8

// Phones preview fewer, with the rest behind a "show more" toggle (the cards are tall stacked).
const MOBILE_PREVIEW = 4

const SORT_OPTIONS: { value: EventSort; label: string }[] = [
  { value: EventSort.recent, label: 'Most recent' },
  { value: EventSort.biggest, label: 'Biggest' },
]

// The high-signal clusters (pathogen-driven, multi-recall) as clickable cards. Clicking one filters
// the recall list + trend to that incident's recalls (its stable slug rides the URL).
export function Outbreaks({ events, activeEvent, onSelect, sort, onSortChange }: OutbreaksProps) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(false)
  const outbreaks = events.filter((event) => event.isOutbreak)
  if (outbreaks.length === 0) return null
  // Recent = latest member report date first; Biggest = most recalls first (ISO dates sort lexically).
  const ranked = [...outbreaks]
    .sort((a, b) =>
      sort === EventSort.recent
        ? (b.lastDate ?? '').localeCompare(a.lastDate ?? '')
        : b.recallCount - a.recallCount
    )
    .slice(0, MAX_OUTBREAKS)
  // Desktop shows the full set; a phone previews MOBILE_PREVIEW until expanded.
  const shown = isMobile && !expanded ? ranked.slice(0, MOBILE_PREVIEW) : ranked
  const canExpand = isMobile && ranked.length > MOBILE_PREVIEW
  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <SegmentedToggle
          ariaLabel="Sort outbreaks"
          options={SORT_OPTIONS}
          value={sort}
          onChange={onSortChange}
        />
      </div>
      <ul className={styles.grid}>
        {shown.map((event) => {
          const active = event.slug === activeEvent
          const span =
            event.firstDate && event.lastDate
              ? `${formatDate(event.firstDate)} – ${formatDate(event.lastDate)}`
              : null
          // Canada carries no company or geography data, so omit a zero count rather than show "0".
          const metaParts: string[] = []
          if (event.companyCount > 0)
            metaParts.push(pluralize(event.companyCount, 'company', 'companies'))
          if (event.stateCount > 0) metaParts.push(pluralize(event.stateCount, 'state', 'states'))
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
                  <span className={styles.title}>
                    <span className={styles.warn} aria-hidden="true">
                      ⚠
                    </span>
                    <span className={styles.entity}>{event.dominantEntity ?? 'Outbreak'}</span>
                  </span>
                  <span className={styles.count}>{event.recallCount} recalls</span>
                </span>
                {metaParts.length > 0 && (
                  <span className={styles.meta}>{metaParts.join(' · ')}</span>
                )}
                {span && <span className={styles.span}>{span}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {canExpand && (
        <ShowMoreToggle
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          className={styles.moreToggle}
        />
      )}
    </div>
  )
}
