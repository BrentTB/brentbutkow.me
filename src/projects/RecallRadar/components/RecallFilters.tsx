import { categoryLabels } from '../data'
import { RecallCategory, RecallClass } from '../recall.types'
import styles from './RecallFilters.module.scss'

type RecallFiltersProps = {
  category: RecallCategory | ''
  classification: RecallClass | ''
  onCategoryChange: (value: RecallCategory | '') => void
  onClassificationChange: (value: RecallClass | '') => void
}

export function RecallFilters({
  category,
  classification,
  onCategoryChange,
  onClassificationChange,
}: RecallFiltersProps) {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <select
          className={styles.select}
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as RecallCategory | '')}
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
          value={classification}
          onChange={(event) => onClassificationChange(event.target.value as RecallClass | '')}
        >
          <option value="">All</option>
          {Object.values(RecallClass).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
