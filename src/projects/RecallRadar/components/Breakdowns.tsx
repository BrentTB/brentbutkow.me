import { categoryLabels, sourceLabels } from '../data'
import { formatNumber, seriesMax } from '../chart-format'
import { EntityType, isRecallCategory, isRecallClass, isRecallSource } from '../recall.types'
import type { RecallFacets, RecallFilterValues } from '../recall.types'
import styles from './Breakdowns.module.scss'

type Row = { label: string; value: string; count: number }

type BreakdownListProps = {
  title: string
  rows: Row[]
  activeValue: string
  onSelect: (value: string) => void
  maxRows?: number
  // Lay the rows out in two columns — for the long theme list, which would otherwise run down the
  // page as one tall column. Collapses back to one column on narrow screens.
  twoColumn?: boolean
}

const MAX_ROWS = 6

export function BreakdownList({
  title,
  rows,
  activeValue,
  onSelect,
  maxRows = MAX_ROWS,
  twoColumn = false,
}: BreakdownListProps) {
  const shown = rows.slice(0, maxRows)
  const max = seriesMax(shown.map((row) => row.count))
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      {shown.length === 0 ? (
        <p className={styles.empty}>No data.</p>
      ) : (
        <ul className={`${styles.rows} ${twoColumn ? styles.twoColumn : ''}`}>
          {shown.map((row) => {
            // Guard the empty active value: with no filter set (activeValue ''), nothing is active —
            // otherwise a row that happens to carry an empty value would light up the whole list.
            const active = activeValue !== '' && row.value === activeValue
            return (
              <li key={row.value}>
                <button
                  type="button"
                  className={`${styles.row} ${active ? styles.active : ''}`}
                  onClick={() => onSelect(active ? '' : row.value)}
                  aria-pressed={active}
                  title={`Filter by ${row.label}`}
                >
                  <span
                    className={styles.barTrack}
                    style={{ width: `${(row.count / max) * 100}%` }}
                  />
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={styles.rowCount}>{formatNumber(row.count)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type BreakdownsProps = {
  // Per-dimension counts under the current filters (each excludes its own dimension, so a selected
  // value never hides its siblings). Falls back to the global stats when facets aren't loaded.
  facets: RecallFacets
  filters: RecallFilterValues
  // Whether the country has company data at all (unfiltered). Drives the Top companies card so it
  // hides for company-less sources (Canada), not merely when a filter leaves no companies.
  hasCompanies: boolean
  onSelect: (patch: Partial<RecallFilterValues>) => void
}

export function Breakdowns({ facets, filters, hasCompanies, onSelect }: BreakdownsProps) {
  const entityRows = (type: EntityType): Row[] =>
    facets.entity
      .filter((entry) => entry.type === type)
      .map((entry) => ({ label: entry.label, value: entry.label, count: entry.count }))
  const allergenRows = entityRows(EntityType.allergen)
  const pathogenRows = entityRows(EntityType.pathogen)

  return (
    <div className={styles.grid}>
      <BreakdownList
        title="By cause"
        activeValue={filters.category}
        onSelect={(value) => onSelect({ category: isRecallCategory(value) ? value : '' })}
        rows={facets.category.map((c) => ({
          label: isRecallCategory(c.label) ? categoryLabels[c.label] : c.label,
          value: c.label,
          count: c.count,
        }))}
      />
      {/* No classifications (South Africa) → hide rather than show an empty card. */}
      {facets.classification.length > 0 && (
        <BreakdownList
          title="By classification"
          activeValue={filters.classification}
          onSelect={(value) => onSelect({ classification: isRecallClass(value) ? value : '' })}
          rows={facets.classification.map((c) => ({
            label: c.label,
            value: c.label,
            count: c.count,
          }))}
        />
      )}
      {/* state carries every state for the map; the leaderboard shows the top rows. UK has no
          states, so it's hidden there. */}
      {facets.state.length > 0 && (
        <BreakdownList
          title="Top states"
          activeValue={filters.state}
          onSelect={(value) => onSelect({ state: value })}
          rows={facets.state.map((c) => ({ label: c.label, value: c.label, count: c.count }))}
        />
      )}
      {/* Canada's feed carries no firm name, so there's nothing to rank. */}
      {hasCompanies && (
        <BreakdownList
          title="Top companies"
          activeValue={filters.company}
          onSelect={(value) => onSelect({ company: value })}
          rows={facets.company.map((c) => ({ label: c.label, value: c.label, count: c.count }))}
        />
      )}
      {/* Entities extracted from the recall reason — click to filter. Hidden when none found. */}
      {allergenRows.length > 0 && (
        <BreakdownList
          title="Top allergens"
          activeValue={filters.entity}
          onSelect={(value) => onSelect({ entity: value })}
          rows={allergenRows}
        />
      )}
      {pathogenRows.length > 0 && (
        <BreakdownList
          title="Top pathogens"
          activeValue={filters.entity}
          onSelect={(value) => onSelect({ entity: value })}
          rows={pathogenRows}
        />
      )}
      {/* One source (UK) → nothing to break down; hidden there. */}
      {facets.source.length > 1 && (
        <BreakdownList
          title="By source"
          activeValue={filters.source}
          onSelect={(value) => onSelect({ source: isRecallSource(value) ? value : '' })}
          rows={facets.source.map((c) => ({
            label: isRecallSource(c.label) ? sourceLabels[c.label] : c.label,
            value: c.label,
            count: c.count,
          }))}
        />
      )}
    </div>
  )
}
