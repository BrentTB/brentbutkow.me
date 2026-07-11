import { Combobox } from '../../../components/inputs/Combobox'
import { Select } from '../../../components/inputs/Select'
import type { SelectOption } from '../../../components/inputs/option.types'
import { categoryLabels, countryLabels, severityLabels, severityOrder } from '../data'
import { RecallCategory, RecallCountry, type SeverityLabel } from '../recall.types'
import type { TrendFilters } from '../api'
import { euCountryGrid } from '../eu-country-grid'
import { regionName } from '../region-names'
import { CompanyFilter } from '../components/CompanyFilter'
import styles from './subscription.module.scss'

const ALL_COUNTRIES = Object.values(RecallCountry)
const ALL_CATEGORIES = Object.values(RecallCategory)

// Countries a subscription can narrow the EU feed to, name-sorted — the same tile set the map uses,
// so the two surfaces never diverge on which countries exist. Follows RASFF, so it's broader than the
// EU-27: EFTA, the UK, microstates, and the Balkans/east all appear.
const EU_MEMBER_OPTIONS: SelectOption[] = euCountryGrid
  .map((tile) => ({ value: tile.code, label: tile.name }))
  .sort((a, b) => a.label.localeCompare(b.label))

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
  'channels (FDA, FSIS, CFIA, FSA, RASFF, NCC) as the source of truth.'

// Copy for the affected-country narrowing, shared with the admin detail view so the two never drift.
// "European" not "EU": the options follow RASFF and reach beyond the EU-27 (EFTA, the UK, the Balkans).
export const AFFECTED_COUNTRIES_LABEL = 'European countries'
export const AFFECTED_COUNTRIES_ALL = 'All European countries'

// Append a trimmed value to a chip list, skipping blanks and case-insensitive duplicates. Returns
// the same list reference when nothing is added, so callers can skip a no-op state update.
const addUnique = (list: string[], raw: string): string[] => {
  const value = raw.trim()
  if (!value || list.some((item) => item.toLowerCase() === value.toLowerCase())) return list
  return [...list, value]
}

// The filter criteria shared by the subscribe form and the manage page. Email lives only on the
// subscribe form, so it is intentionally absent here.
export type FilterFieldsValue = {
  countries: RecallCountry[]
  // EU member-state narrowing (ISO alpha-2). Empty = every EU recall. Only meaningful when `eu` is
  // among `countries`; the backend ignores it otherwise.
  affectedCountries: string[]
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
  // Scope the company type-ahead to the selected country when exactly one is chosen; otherwise search
  // across all. The Combobox re-fetches whenever this path changes, so suggestions track typing.
  const companyScope: TrendFilters =
    value.countries.length === 1 ? { country: value.countries[0] } : {}

  const toggleCountry = (country: RecallCountry) => {
    onCountriesUserChange?.()
    const next = value.countries.includes(country)
      ? value.countries.filter((c) => c !== country)
      : [...value.countries, country]
    setField('countries', next)
    // Dropping EU makes any member-state narrowing meaningless — clear it so a later re-subscribe
    // to EU starts from "all", and no stale codes linger in the saved criteria.
    if (country === RecallCountry.eu && !next.includes(RecallCountry.eu)) {
      setField('affectedCountries', [])
    }
  }

  const addAffectedCountry = (code: string) => {
    if (code && !value.affectedCountries.includes(code)) {
      setField('affectedCountries', [...value.affectedCountries, code])
    }
  }

  const removeAffectedCountry = (code: string) =>
    setField(
      'affectedCountries',
      value.affectedCountries.filter((c) => c !== code)
    )

  // Member states not yet chosen — the Combobox only offers additions.
  const affectedCountryOptions = EU_MEMBER_OPTIONS.filter(
    (option) => !value.affectedCountries.includes(option.value)
  )

  const toggleCategory = (category: RecallCategory) => {
    setField(
      'categories',
      value.categories.includes(category)
        ? value.categories.filter((c) => c !== category)
        : [...value.categories, category]
    )
  }

  const addEntity = (raw: string) => {
    const next = addUnique(value.entities, raw)
    if (next !== value.entities) setField('entities', next)
  }

  // Suggestions minus the chips already picked, so the menu only offers new additions.
  const entitySuggestions: SelectOption[] = entityOptions
    .filter((option) => !value.entities.some((e) => e.toLowerCase() === option.toLowerCase()))
    .map((option) => ({ value: option, label: option }))

  const removeEntity = (entity: string) =>
    setField(
      'entities',
      value.entities.filter((e) => e !== entity)
    )

  const addCompany = (raw: string) => {
    const next = addUnique(value.companies, raw)
    if (next !== value.companies) setField('companies', next)
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

      {/* The EU feed (RASFF) spans ~40 countries, so let a subscriber narrow to the ones they care
          about. Only shown once EU is chosen; empty means every EU recall (progressive disclosure
          keeps the default form simple). */}
      {value.countries.includes(RecallCountry.eu) && (
        <div className={styles.field}>
          <span className={styles.label}>{AFFECTED_COUNTRIES_LABEL}</span>
          <p className={styles.hint}>
            Optional. Leave empty for every EU recall, or pick countries to be emailed only recalls
            that name them — as the notifying country or a destination. Some recalls are attributed
            to a country only after follow-up.
          </p>
          {value.affectedCountries.length > 0 && (
            <div className={styles.chipRow}>
              {value.affectedCountries.map((code) => (
                <span key={code} className={styles.tag}>
                  {regionName(code)}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => removeAffectedCountry(code)}
                    aria-label={`Remove ${regionName(code)}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <Combobox
            value=""
            options={affectedCountryOptions}
            onChange={addAffectedCountry}
            ariaLabel="Add a European country"
            placeholder={value.affectedCountries.length ? 'Add another…' : AFFECTED_COUNTRIES_ALL}
            widthCh={36}
          />
        </div>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Allergens, pathogens & hazards</span>
        {value.entities.length > 0 && (
          <div className={styles.chipRow}>
            {value.entities.map((entity) => (
              <span key={entity} className={styles.tag}>
                {entity}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => removeEntity(entity)}
                  aria-label={`Remove ${entity}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {/* A portaled Combobox menu, not a native datalist — mobile keyboards resize the viewport
            when they open, which dismisses datalist popups the instant they appear. */}
        <Combobox
          freeText
          value=""
          options={entitySuggestions}
          onChange={addEntity}
          onBackspaceEmpty={() => {
            if (value.entities.length > 0) setField('entities', value.entities.slice(0, -1))
          }}
          ariaLabel="Add an allergen, pathogen, or hazard"
          placeholder={value.entities.length ? 'Add another…' : 'e.g. peanut, listeria'}
          widthCh={36}
        />
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
                  ✕
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
