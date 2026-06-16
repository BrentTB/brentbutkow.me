import { categoryLabels, classesByCountry, sourceLabels, sourcesByCountry } from '../data'
import {
  RecallCategory,
  isRecallCategory,
  isRecallClass,
  isRecallSource,
  type RecallCountry,
  type RecallFilterValues,
} from '../recall.types'
import { Select, type SelectOption } from '../../../components/inputs/Select'
import styles from './RecallFilters.module.scss'

type RecallFiltersProps = {
  filters: RecallFilterValues
  country: RecallCountry
  stateOptions: string[]
  companyOptions: string[]
  onChange: (patch: Partial<RecallFilterValues>) => void
  onClear: () => void
}

const ALL: SelectOption = { value: '', label: 'All' }

export function RecallFilters({
  filters,
  country,
  stateOptions,
  companyOptions,
  onChange,
  onClear,
}: RecallFiltersProps) {
  // Classification + source options are country-specific so the US/UK dropdowns stay separate.
  const classOptions = classesByCountry[country]
  const sourceOptions = sourcesByCountry[country]
  const hasActive = Boolean(
    filters.category ||
    filters.classification ||
    filters.state ||
    filters.company ||
    filters.source ||
    filters.entity ||
    filters.search.trim()
  )

  const categoryOptions: SelectOption[] = [
    ALL,
    ...Object.values(RecallCategory).map((value) => ({ value, label: categoryLabels[value] })),
  ]
  const classificationOptions: SelectOption[] = [
    ALL,
    ...classOptions.map((value) => ({ value, label: value })),
  ]
  const sourceFilterOptions: SelectOption[] = [
    ALL,
    ...sourceOptions.map((value) => ({ value, label: sourceLabels[value] })),
  ]
  const stateFilterOptions: SelectOption[] = [
    ALL,
    ...stateOptions.map((value) => ({ value, label: value })),
  ]
  const companyFilterOptions: SelectOption[] = [
    ALL,
    ...companyOptions.map((value) => ({ value, label: value })),
  ]

  return (
    <div className={styles.filters}>
      <label className={`${styles.field} ${styles.searchField}`}>
        <span className={styles.label}>Search</span>
        <input
          type="search"
          className={styles.search}
          placeholder="Search product, reason, or company…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Category</span>
        <Select
          ariaLabel="Category"
          value={filters.category}
          options={categoryOptions}
          onChange={(value) => onChange({ category: isRecallCategory(value) ? value : '' })}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Classification</span>
        <Select
          ariaLabel="Classification"
          value={filters.classification}
          options={classificationOptions}
          onChange={(value) => onChange({ classification: isRecallClass(value) ? value : '' })}
        />
      </div>

      {sourceOptions.length > 1 && (
        <div className={styles.field}>
          <span className={styles.label}>Source</span>
          <Select
            ariaLabel="Source"
            value={filters.source}
            options={sourceFilterOptions}
            onChange={(value) => onChange({ source: isRecallSource(value) ? value : '' })}
          />
        </div>
      )}

      {stateOptions.length > 0 && (
        <div className={styles.field}>
          <span className={styles.label}>State</span>
          <Select
            ariaLabel="State"
            value={filters.state}
            options={stateFilterOptions}
            onChange={(value) => onChange({ state: value })}
          />
        </div>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Company</span>
        <Select
          ariaLabel="Company"
          value={filters.company}
          options={companyFilterOptions}
          onChange={(value) => onChange({ company: value })}
        />
      </div>

      {hasActive && (
        <button type="button" className={styles.clear} onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  )
}
