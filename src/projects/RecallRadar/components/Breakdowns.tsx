import { categoryLabels } from '../data'
import { formatNumber } from '../chart-format'
import type { RecallCategory, RecallClass, RecallFilterValues, RecallStats } from '../recall.types'
import styles from './Breakdowns.module.scss'

type Row = { label: string; value: string; count: number }

type BreakdownListProps = {
  title: string
  rows: Row[]
  activeValue: string
  onSelect: (value: string) => void
}

function BreakdownList({ title, rows, activeValue, onSelect }: BreakdownListProps) {
  const max = Math.max(...rows.map((row) => row.count), 1)
  return (
    <div className={styles.list}>
      <h3 className={styles.title}>{title}</h3>
      {rows.length === 0 ? (
        <p className={styles.empty}>No data.</p>
      ) : (
        <ul className={styles.rows}>
          {rows.map((row) => {
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
  return (
    <div className={styles.grid}>
      <BreakdownList
        title="By cause"
        activeValue={filters.category}
        onSelect={(value) => onSelect({ category: value as RecallCategory | '' })}
        rows={stats.byCategory.map((c) => ({
          label: categoryLabels[c.category],
          value: c.category,
          count: c.count,
        }))}
      />
      <BreakdownList
        title="By classification"
        activeValue={filters.classification}
        onSelect={(value) => onSelect({ classification: value as RecallClass | '' })}
        rows={stats.byClassification.map((c) => ({
          label: c.label,
          value: c.label,
          count: c.count,
        }))}
      />
      <BreakdownList
        title="Top states"
        activeValue={filters.state}
        onSelect={(value) => onSelect({ state: value })}
        rows={stats.byState.map((c) => ({ label: c.label, value: c.label, count: c.count }))}
      />
      <BreakdownList
        title="Top companies"
        activeValue={filters.company}
        onSelect={(value) => onSelect({ company: value })}
        rows={stats.byCompany.map((c) => ({ label: c.label, value: c.label, count: c.count }))}
      />
    </div>
  )
}
