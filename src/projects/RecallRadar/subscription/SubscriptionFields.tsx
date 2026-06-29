import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Select } from '../../../components/inputs/Select'
import type { SelectOption } from '../../../components/inputs/option.types'
import { categoryLabels, countryLabels, severityLabels, severityOrder } from '../data'
import { RecallCategory, RecallCountry, type SeverityLabel } from '../recall.types'
import type { TrendFilters } from '../api'
import { CompanyFilter } from '../components/CompanyFilter'
import styles from './SubscriptionPanel.module.scss'

const ALL_COUNTRIES = Object.values(RecallCountry)
const ALL_CATEGORIES = Object.values(RecallCategory)

// "Any severity" ('') means no threshold — the matcher treats it the same as the lowest band, so it
// reads clearer than a literal "Low" default. Levels run low → critical (ascending threshold).
const SEVERITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any severity' },
  ...severityOrder
    .slice()
    .reverse()
    .map((level) => ({ value: level, label: severityLabels[level] })),
]

export const SUBSCRIPTION_DISCLAIMER =
  'Recall alerts are best-effort and sent via a free service. Always treat official agency ' +
  'channels (FDA, FSIS, FSA, NCC) as the source of truth.'

// The filter criteria shared by the subscribe form and the manage page. Email lives only on the
// subscribe form, so it is intentionally absent here.
export type FilterFieldsValue = {
  countries: RecallCountry[]
  entities: string[]
  companies: string[]
  categories: RecallCategory[]
  minSeverity: SeverityLabel | ''
}

type SubscriptionFieldsProps = {
  value: FilterFieldsValue
  setField: <K extends keyof FilterFieldsValue>(key: K, fieldValue: FilterFieldsValue[K]) => void
  entityOptions?: string[]
  errors?: Partial<Record<keyof FilterFieldsValue, string>>
  // Lets a parent (the subscribe panel) stop auto-selecting the geo country once the user picks.
  onCountriesUserChange?: () => void
}

export function SubscriptionFields({
  value,
  setField,
  entityOptions = [],
  errors = {},
  onCountriesUserChange,
}: SubscriptionFieldsProps) {
  const [entityDraft, setEntityDraft] = useState('')
  const baseId = useId()
  const entityListId = `${baseId}-entities`

  // Scope the company type-ahead to the selected country when exactly one is chosen; otherwise search
  // across all. The Combobox re-fetches whenever this path changes, so suggestions track typing.
  const companyScope: TrendFilters =
    value.countries.length === 1 ? { country: value.countries[0] } : {}

  const toggleCountry = (country: RecallCountry) => {
    onCountriesUserChange?.()
    setField(
      'countries',
      value.countries.includes(country)
        ? value.countries.filter((c) => c !== country)
        : [...value.countries, country]
    )
  }

  const toggleCategory = (category: RecallCategory) => {
    setField(
      'categories',
      value.categories.includes(category)
        ? value.categories.filter((c) => c !== category)
        : [...value.categories, category]
    )
  }

  const addEntity = (raw: string) => {
    const entity = raw.trim()
    setEntityDraft('')
    if (!entity) return
    if (value.entities.some((e) => e.toLowerCase() === entity.toLowerCase())) return
    setField('entities', [...value.entities, entity])
  }

  const onEntityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    // Picking a suggestion (or typing a full known entity) commits it as a chip immediately, so the
    // field clears ready for the next one.
    if (next && entityOptions.some((o) => o.toLowerCase() === next.toLowerCase())) {
      addEntity(next)
      return
    }
    setEntityDraft(next)
  }

  const onEntityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addEntity(entityDraft)
    } else if (event.key === 'Backspace' && entityDraft === '' && value.entities.length > 0) {
      setField('entities', value.entities.slice(0, -1))
    }
  }

  const removeEntity = (entity: string) =>
    setField(
      'entities',
      value.entities.filter((e) => e !== entity)
    )

  const addCompany = (raw: string) => {
    const company = raw.trim()
    if (!company) return
    if (value.companies.some((c) => c.toLowerCase() === company.toLowerCase())) return
    setField('companies', [...value.companies, company])
  }

  const removeCompany = (company: string) =>
    setField(
      'companies',
      value.companies.filter((c) => c !== company)
    )

  return (
    <>
      <fieldset className={styles.group}>
        <legend className={styles.label}>Countries</legend>
        <div className={styles.checks}>
          {ALL_COUNTRIES.map((country) => (
            <label key={country} className={styles.check}>
              <input
                type="checkbox"
                checked={value.countries.includes(country)}
                onChange={() => toggleCountry(country)}
              />
              {countryLabels[country]}
            </label>
          ))}
        </div>
        {errors.countries && <span className={styles.fieldError}>{errors.countries}</span>}
      </fieldset>

      <div className={styles.field}>
        <span className={styles.label}>Allergens, pathogens & hazards</span>
        <div className={styles.tags}>
          {value.entities.map((entity) => (
            <span key={entity} className={styles.tag}>
              {entity}
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => removeEntity(entity)}
                aria-label={`Remove ${entity}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className={styles.tagInput}
            value={entityDraft}
            onChange={onEntityChange}
            onKeyDown={onEntityKeyDown}
            onBlur={() => addEntity(entityDraft)}
            placeholder={value.entities.length ? 'Add another…' : 'e.g. peanut, listeria'}
            list={entityListId}
            aria-label="Add an allergen, pathogen, or hazard"
          />
          <datalist id={entityListId}>
            {entityOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Companies</span>
        {value.companies.length > 0 && (
          <div className={styles.chipRow}>
            {value.companies.map((company) => (
              <span key={company} className={styles.tag}>
                {company}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => removeCompany(company)}
                  aria-label={`Remove ${company}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {/* The Combobox value stays empty: each pick is added to the chip list above. */}
        <CompanyFilter filters={companyScope} value="" onChange={addCompany} />
      </div>

      <fieldset className={styles.group}>
        <legend className={styles.label}>Categories</legend>
        <div className={styles.checks}>
          {ALL_CATEGORIES.map((category) => (
            <label key={category} className={styles.check}>
              <input
                type="checkbox"
                checked={value.categories.includes(category)}
                onChange={() => toggleCategory(category)}
              />
              {categoryLabels[category]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <span className={styles.label}>Minimum severity</span>
        <Select
          ariaLabel="Minimum severity"
          value={value.minSeverity}
          options={SEVERITY_OPTIONS}
          onChange={(next) => setField('minSeverity', next as FilterFieldsValue['minSeverity'])}
        />
      </div>
    </>
  )
}
