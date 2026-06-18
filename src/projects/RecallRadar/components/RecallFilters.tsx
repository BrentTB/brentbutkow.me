import { categoryLabels, classesByCountry, sourceLabels, sourcesByCountry } from '../data'
import {
  RecallCategory,
  isRecallCategory,
  isRecallClass,
  isRecallSource,
  type RecallCountry,
  type RecallFilterValues,
} from '../recall.types'
import { Combobox } from '../../../components/inputs/Combobox'
import { Select, type SelectOption } from '../../../components/inputs/Select'
import { CompanyFilter } from './CompanyFilter'
import styles from './RecallFilters.module.scss'

type RecallFiltersProps = {
  filters: RecallFilterValues
  country: RecallCountry
  stateOptions: string[]
  onChange: (patch: Partial<RecallFilterValues>) => void
  onClear: () => void
}

const ALL: SelectOption = { value: '', label: 'All' }

export function RecallFilters({
  filters,
  country,
  stateOptions,
  onChange,
  onClear,
}: RecallFiltersProps) {
  // Classification + source options are country-specific so the US/UK dropdowns stay separate.
  const classOptions = classesByCountry[country]
  const sourceOptions = sourcesByCountry[country]
  // One removable chip per active filter — surfaces what's scoping the chart + list, and lets each
  // be cleared on its own (clicks from the breakdowns/map land here too).
  const chips: { key: string; label: string; patch: Partial<RecallFilterValues> }[] = []
  if (filters.search.trim())
    chips.push({ key: 'search', label: `“${filters.search.trim()}”`, patch: { search: '' } })
  if (filters.category)
    chips.push({
      key: 'category',
      label: categoryLabels[filters.category],
      patch: { category: '' },
    })
  if (filters.classification)
    chips.push({
      key: 'classification',
      label: filters.classification,
      patch: { classification: '' },
    })
  if (filters.source)
    chips.push({ key: 'source', label: sourceLabels[filters.source], patch: { source: '' } })
  if (filters.state) chips.push({ key: 'state', label: filters.state, patch: { state: '' } })
  if (filters.company)
    chips.push({ key: 'company', label: filters.company, patch: { company: '' } })
  if (filters.entity) chips.push({ key: 'entity', label: filters.entity, patch: { entity: '' } })
  if (filters.since)
    chips.push({ key: 'since', label: `From ${filters.since}`, patch: { since: '' } })
  if (filters.until)
    chips.push({ key: 'until', label: `To ${filters.until}`, patch: { until: '' } })

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
  return (
    <div className={styles.root}>
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
            <Combobox
              ariaLabel="State"
              value={filters.state}
              options={stateOptions.map((code) => ({ value: code, label: code }))}
              onChange={(value) => onChange({ state: value })}
              placeholder="Search states…"
            />
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label}>Company</span>
          <CompanyFilter
            country={country}
            value={filters.company}
            onChange={(value) => onChange({ company: value })}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>From</span>
          <input
            type="date"
            aria-label="Recalls reported on or after"
            className={styles.date}
            value={filters.since}
            max={filters.until || undefined}
            onChange={(event) => onChange({ since: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>To</span>
          <input
            type="date"
            aria-label="Recalls reported on or before"
            className={styles.date}
            value={filters.until}
            min={filters.since || undefined}
            onChange={(event) => onChange({ until: event.target.value })}
          />
        </div>
      </div>
      {chips.length > 0 && (
        <div className={styles.chips}>
          <span className={styles.chipsLabel}>Filtering</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={styles.chip}
              aria-label={`Remove ${chip.label} filter`}
              onClick={() => onChange(chip.patch)}
            >
              <span>{chip.label}</span>
              <span className={styles.chipX} aria-hidden="true">
                ✕
              </span>
            </button>
          ))}
          <button type="button" className={styles.clearAll} onClick={onClear}>
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
