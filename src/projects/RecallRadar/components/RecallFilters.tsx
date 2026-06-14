import { categoryLabels } from '../data'
import {
  RecallCategory,
  RecallClass,
  isRecallCategory,
  isRecallClass,
  type RecallFilterValues,
} from '../recall.types'
import styles from './RecallFilters.module.scss'

type RecallFiltersProps = {
  filters: RecallFilterValues
  stateOptions: string[]
  companyOptions: string[]
  onChange: (patch: Partial<RecallFilterValues>) => void
  onClear: () => void
}

export function RecallFilters({
  filters,
  stateOptions,
  companyOptions,
  onChange,
  onClear,
}: RecallFiltersProps) {
  const hasActive = Boolean(
    filters.category || filters.classification || filters.state || filters.company
  )

  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <select
          className={styles.select}
          value={filters.category}
          onChange={(event) => {
            const value = event.target.value
            onChange({ category: isRecallCategory(value) ? value : '' })
          }}
        >
          <option value="">All</option>
          {Object.values(RecallCategory).map((value) => (
            <option key={value} value={value}>
              {categoryLabels[value]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Classification</span>
        <select
          className={styles.select}
          value={filters.classification}
          onChange={(event) => {
            const value = event.target.value
            onChange({ classification: isRecallClass(value) ? value : '' })
          }}
        >
          <option value="">All</option>
          {Object.values(RecallClass).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>State</span>
        <select
          className={styles.select}
          value={filters.state}
          onChange={(event) => onChange({ state: event.target.value })}
        >
          <option value="">All</option>
          {stateOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Company</span>
        <select
          className={styles.select}
          value={filters.company}
          onChange={(event) => onChange({ company: event.target.value })}
        >
          <option value="">All</option>
          {companyOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {hasActive && (
        <button type="button" className={styles.clear} onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  )
}
