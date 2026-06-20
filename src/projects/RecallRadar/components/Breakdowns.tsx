import { categoryLabels, sourceLabels } from '../data'
import { formatNumber, seriesMax } from '../chart-format'
import { EntityType, isRecallCategory, isRecallClass, isRecallSource } from '../recall.types'
import type { RecallFilterValues, RecallStats } from '../recall.types'
import styles from './Breakdowns.module.scss'

type Row = { label: string; value: string; count: number }

type BreakdownListProps = {
  title: string
  rows: Row[]
  activeValue: string
  onSelect: (value: string) => void
  maxRows?: number
}

const MAX_ROWS = 6

export function BreakdownList({
  title,
  rows,
  activeValue,
  onSelect,
  maxRows = MAX_ROWS,
}: BreakdownListProps) {
  const shown = rows.slice(0, maxRows)
  const max = seriesMax(shown.map((row) => row.count))
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      {shown.length === 0 ? (
        <p className={styles.empty}>No data.</p>
      ) : (
        <ul className={styles.rows}>
          {shown.map((row) => {
            const active = row.value === activeValue
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
  stats: RecallStats
  filters: RecallFilterValues
  onSelect: (patch: Partial<RecallFilterValues>) => void
}

export function Breakdowns({ stats, filters, onSelect }: BreakdownsProps) {
  const entityRows = (type: EntityType): Row[] =>
    stats.byEntity
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
        rows={stats.byCategory.map((c) => ({
          label: categoryLabels[c.category],
          value: c.category,
          count: c.count,
        }))}
      />
      <BreakdownList
        title="By classification"
        activeValue={filters.classification}
        onSelect={(value) => onSelect({ classification: isRecallClass(value) ? value : '' })}
        rows={stats.byClassification.map((c) => ({
          label: c.label,
          value: c.label,
          count: c.count,
        }))}
      />
      {/* byState carries every state for the map; the leaderboard shows the top rows. UK has no
          states, so it's hidden there. */}
      {stats.byState.length > 0 && (
        <BreakdownList
          title="Top states"
          activeValue={filters.state}
          onSelect={(value) => onSelect({ state: value })}
          rows={stats.byState.map((c) => ({ label: c.label, value: c.label, count: c.count }))}
        />
      )}
      <BreakdownList
        title="Top companies"
        activeValue={filters.company}
        onSelect={(value) => onSelect({ company: value })}
        rows={stats.byCompany.map((c) => ({ label: c.label, value: c.label, count: c.count }))}
      />
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
      {stats.bySource.length > 1 && (
        <BreakdownList
          title="By source"
          activeValue={filters.source}
          onSelect={(value) => onSelect({ source: isRecallSource(value) ? value : '' })}
          rows={stats.bySource.map((c) => ({
            label: isRecallSource(c.label) ? sourceLabels[c.label] : c.label,
            value: c.label,
            count: c.count,
          }))}
        />
      )}
    </div>
  )
}
