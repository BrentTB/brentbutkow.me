import { useState } from 'react'
import {
  categoryLabels,
  classesByCountry,
  severityLabels,
  severityOrder,
  sourceLabels,
  sourcesByCountry,
} from '../data'
import {
  RecallCategory,
  isRecallCategory,
  isRecallClass,
  isRecallSource,
  isSeverityLabel,
  type LabelCount,
  type RecallCountry,
  type RecallFacets,
  type RecallFilterValues,
} from '../recall.types'
import type { TrendFilters } from '../api'
import { regionName } from '../region-names'
import { Combobox } from '../../../components/inputs/Combobox'
import { Select } from '../../../components/inputs/Select'
import type { SelectOption } from '../../../components/inputs/option.types'
import { CompanyFilter } from './CompanyFilter'
import styles from './RecallFilters.module.scss'

type RecallFiltersProps = {
  filters: RecallFilterValues
  country: RecallCountry
  stateOptions: string[]
  // ISO codes with recalls (EU only — empty elsewhere, which hides the control like stateOptions).
  affectedCountryOptions: string[]
  // Whether the country has any company data — gates the company type-ahead. Derived from the
  // unfiltered base set in RecallRadar (see the comment there).
  hasCompanies: boolean
  // Live per-facet counts under the current filters; undefined while loading or on error (the
  // controls then render without counts).
  facets?: RecallFacets
  // The active filter set, forwarded to the company type-ahead so its counts reflect the rest.
  activeFilters: TrendFilters
  topicLabel?: string
  eventLabel?: string
  onChange: (patch: Partial<RecallFilterValues>) => void
  onClear: () => void
}

const ALL: SelectOption = { value: '', label: 'All' }

const countsOf = (list: LabelCount[]): Map<string, number> =>
  new Map(list.map((entry) => [entry.label, entry.count]))

// Merge facet counts onto a known option list: annotate each with its count, disable the zero-result
// ones (but never the current selection, so it stays clearable), and order the available options
// first with the dead ends after. Returns the list unchanged when counts aren't loaded yet.
function faceted(
  base: SelectOption[],
  counts: Map<string, number> | null,
  selected: string
): SelectOption[] {
  if (!counts) return base
  const annotated = base.map((option) => {
    const count = counts.get(option.value) ?? 0
    return { ...option, count, disabled: count === 0 && option.value !== selected }
  })
  return [...annotated.filter((option) => !option.disabled), ...annotated.filter((o) => o.disabled)]
}

export function RecallFilters({
  filters,
  country,
  stateOptions,
  affectedCountryOptions,
  hasCompanies,
  facets,
  activeFilters,
  topicLabel,
  eventLabel,
  onChange,
  onClear,
}: RecallFiltersProps) {
  // Classification + source options are country-specific so the US/UK dropdowns stay separate.
  const classOptions = classesByCountry[country]
  const sourceOptions = sourcesByCountry[country]

  // The bar shows a key few controls inline; the rest live behind "More filters" so the sticky bar
  // stays one row by default. Expansion is the user's toggle alone — an advanced filter set from
  // elsewhere (a company/state click on the page, or a shared URL) stays hidden and is surfaced only
  // by its removable chip below, so selecting one never makes the bar jump open.
  const [showMore, setShowMore] = useState(false)

  // One removable chip per active filter — surfaces what's scoping the chart + list, and lets each
  // be cleared on its own (clicks from the breakdowns/map land here too).
  // `remove` is the screen-reader phrase for the chip's clear button; defaults to the visible label,
  // overridden where the label alone reads poorly aloud (e.g. a raw ISO date).
  const chips: {
    key: string
    label: string
    remove?: string
    patch: Partial<RecallFilterValues>
  }[] = []
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
  if (filters.severity)
    chips.push({
      key: 'severity',
      label: `${severityLabels[filters.severity]} severity`,
      remove: 'the severity',
      patch: { severity: '' },
    })
  // Topic is set via the Themes cards / per-card chip; show its resolved label (not the raw id).
  if (filters.topic && topicLabel)
    chips.push({
      key: 'topic',
      label: `Theme: ${topicLabel}`,
      remove: 'the theme',
      patch: { topic: '' },
    })
  // Event is set via the Outbreaks cards / per-card outbreak badge; show its resolved label.
  if (filters.event && eventLabel)
    chips.push({
      key: 'event',
      label: `Outbreak: ${eventLabel}`,
      remove: 'the outbreak',
      patch: { event: '' },
    })
  if (filters.source)
    chips.push({ key: 'source', label: sourceLabels[filters.source], patch: { source: '' } })
  if (filters.state) chips.push({ key: 'state', label: filters.state, patch: { state: '' } })
  // Like company below: the chip renders even when the control is hidden (a shared
  // ?affectedCountry= URL on a non-EU country), so the filter always stays removable.
  if (filters.affectedCountry)
    chips.push({
      key: 'affectedCountry',
      label: regionName(filters.affectedCountry),
      remove: 'the affected country',
      patch: { affectedCountry: '' },
    })
  // Chip survives even on a company-less country (e.g. a shared ?company= URL on Canada) so the
  // filter stays removable, though `hasCompanies` keeps the type-ahead itself hidden.
  if (filters.company)
    chips.push({ key: 'company', label: filters.company, patch: { company: '' } })
  if (filters.entity) chips.push({ key: 'entity', label: filters.entity, patch: { entity: '' } })
  if (filters.since)
    chips.push({
      key: 'since',
      label: `From ${filters.since}`,
      remove: 'the start date',
      patch: { since: '' },
    })
  if (filters.until)
    chips.push({
      key: 'until',
      label: `To ${filters.until}`,
      remove: 'the end date',
      patch: { until: '' },
    })

  // On a phone the active-filter chips are hidden while the bar is collapsed (they're tall); a count
  // badge on the toggle signals how many are applied. Search is excluded — its box stays visible.
  const activeCount = chips.filter((chip) => chip.key !== 'search').length

  // Faceted option lists: each control's known options annotated with live counts, zero-result ones
  // greyed + sorted last. "All" leads and is never counted/disabled (it clears the facet).
  const baseCategory = Object.values(RecallCategory).map((value) => ({
    value,
    label: categoryLabels[value],
  }))
  const baseClassification = classOptions.map((value) => ({ value, label: value }))
  const baseSeverity = severityOrder.map((value) => ({ value, label: severityLabels[value] }))
  const baseSource = sourceOptions.map((value) => ({ value, label: sourceLabels[value] }))
  const baseState = stateOptions.map((code) => ({ value: code, label: code }))
  const baseAffectedCountry = affectedCountryOptions.map((code) => ({
    value: code,
    label: regionName(code),
  }))

  const categoryOptions: SelectOption[] = [
    ALL,
    ...faceted(baseCategory, facets ? countsOf(facets.category) : null, filters.category),
  ]
  const classificationOptions: SelectOption[] = [
    ALL,
    ...faceted(
      baseClassification,
      facets ? countsOf(facets.classification) : null,
      filters.classification
    ),
  ]
  const severityOptions: SelectOption[] = [
    ALL,
    ...faceted(baseSeverity, facets ? countsOf(facets.severity) : null, filters.severity),
  ]
  const sourceFilterOptions: SelectOption[] = [
    ALL,
    ...faceted(baseSource, facets ? countsOf(facets.source) : null, filters.source),
  ]
  const stateFilterOptions = faceted(
    baseState,
    facets ? countsOf(facets.state) : null,
    filters.state
  )
  const affectedCountryFilterOptions = faceted(
    baseAffectedCountry,
    facets?.affectedCountry ? countsOf(facets.affectedCountry) : null,
    filters.affectedCountry
  )
  return (
    <div className={styles.root} data-expanded={showMore ? 'true' : 'false'}>
      <div className={styles.bar}>
        <input
          type="search"
          className={styles.search}
          aria-label="Search recalls"
          placeholder={
            hasCompanies ? 'Search product, reason, or company…' : 'Search product or reason…'
          }
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />

        {/* Cause / Class / Severity flow inline in the bar on desktop; on phones they collapse
            behind "More filters" too, so the resting bar is just search + toggle — active picks
            still surface as removable chips below. */}
        <div className={styles.primaryFields} data-open={showMore ? 'true' : 'false'}>
          <div className={styles.field}>
            <span className={styles.label}>Cause</span>
            <Select
              ariaLabel="Cause"
              value={filters.category}
              options={categoryOptions}
              onChange={(value) => onChange({ category: isRecallCategory(value) ? value : '' })}
            />
          </div>

          {/* No classifications for a country (South Africa) → hide the control entirely. */}
          {classOptions.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Class</span>
              <Select
                ariaLabel="Class"
                value={filters.classification}
                options={classificationOptions}
                onChange={(value) =>
                  onChange({ classification: isRecallClass(value) ? value : '' })
                }
              />
            </div>
          )}

          <div className={styles.field}>
            <span className={styles.label}>Severity</span>
            <Select
              ariaLabel="Severity"
              value={filters.severity}
              options={severityOptions}
              onChange={(value) => onChange({ severity: isSeverityLabel(value) ? value : '' })}
            />
          </div>
        </div>

        <button
          type="button"
          className={styles.more}
          aria-expanded={showMore}
          onClick={() => setShowMore((prev) => !prev)}
        >
          {showMore ? '− Fewer filters' : '+ More filters'}
          {!showMore && activeCount > 0 && (
            <span className={styles.moreCount} aria-label={`${activeCount} active`}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {showMore && (
        <div className={styles.bar}>
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
                options={stateFilterOptions}
                onChange={(value) => onChange({ state: value })}
                placeholder="Search states…"
              />
            </div>
          )}

          {affectedCountryOptions.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Country</span>
              <Combobox
                ariaLabel="Affected country"
                value={filters.affectedCountry}
                options={affectedCountryFilterOptions}
                onChange={(value) => onChange({ affectedCountry: value })}
                placeholder="Search countries…"
              />
            </div>
          )}

          {hasCompanies && (
            <div className={styles.field}>
              <span className={styles.label}>Company</span>
              <CompanyFilter
                filters={activeFilters}
                value={filters.company}
                onChange={(value) => onChange({ company: value })}
              />
            </div>
          )}

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
      )}

      {chips.length > 0 && (
        <div className={styles.chips}>
          <span className={styles.chipsLabel}>Filtering</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={styles.chip}
              aria-label={`Remove ${chip.remove ?? chip.label} filter`}
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
