// Mirrors the backend DTOs. Derived enums — values double as runtime identifiers.
export const RecallCategory = {
  allergen: 'allergen',
  pathogen: 'pathogen',
  foreignMaterial: 'foreignMaterial',
  mislabeling: 'mislabeling',
  contaminant: 'contaminant',
  other: 'other',
} as const
export type RecallCategory = (typeof RecallCategory)[keyof typeof RecallCategory]

export const RecallClass = {
  classI: 'Class I',
  classII: 'Class II',
  classIII: 'Class III',
  publicHealthAlert: 'Public Health Alert',
  productRecall: 'Product Recall',
  allergyAlert: 'Allergy Alert',
  foodAlertForAction: 'Food Alert for Action',
} as const
export type RecallClass = (typeof RecallClass)[keyof typeof RecallClass]

export const RecallSource = {
  fda: 'fda',
  usda: 'usda',
  uk: 'uk',
  ncc: 'ncc',
  woolworths: 'woolworths',
  shoprite: 'shoprite',
  nrcs: 'nrcs',
} as const
export type RecallSource = (typeof RecallSource)[keyof typeof RecallSource]

export const RecallCountry = {
  us: 'us',
  uk: 'uk',
  za: 'za',
} as const
export type RecallCountry = (typeof RecallCountry)[keyof typeof RecallCountry]

export const EntityType = {
  allergen: 'allergen',
  pathogen: 'pathogen',
  hazard: 'hazard',
  contaminant: 'contaminant',
} as const
export type EntityType = (typeof EntityType)[keyof typeof EntityType]

export const AnomalyScope = {
  overall: 'overall',
  category: 'category',
  entity: 'entity',
} as const
export type AnomalyScope = (typeof AnomalyScope)[keyof typeof AnomalyScope]

export const TrendGroup = {
  total: 'total',
  category: 'category',
  source: 'source',
  severity: 'severity',
  classification: 'classification',
} as const
export type TrendGroup = (typeof TrendGroup)[keyof typeof TrendGroup]

export const SeverityLabel = {
  low: 'low',
  moderate: 'moderate',
  high: 'high',
  severe: 'severe',
} as const
export type SeverityLabel = (typeof SeverityLabel)[keyof typeof SeverityLabel]

export const RecallSort = {
  recency: 'recency',
  severity: 'severity',
} as const
export type RecallSort = (typeof RecallSort)[keyof typeof RecallSort]

// UI filter state — '' means "no filter".
export type RecallFilterValues = {
  category: RecallCategory | ''
  classification: RecallClass | ''
  severity: SeverityLabel | ''
  topic: string // topic slug (stable theme key); '' = no filter
  event: string // event/outbreak slug (stable cluster key); '' = no filter
  state: string
  company: string
  source: RecallSource | ''
  entity: string
  search: string
  since: string // YYYY-MM-DD, '' = no lower bound
  until: string // YYYY-MM-DD, '' = no upper bound
}

export type Recall = {
  country: RecallCountry
  source: RecallSource
  recallNumber: string
  sourceUrl: string | null
  status: string | null
  classification: RecallClass | null
  productDescription: string
  reasonText: string
  companyName: string | null
  state: string | null
  distributionPattern: string | null
  recallInitiationDate: string | null
  reportDate: string | null
  category: RecallCategory
  categoryConfidence: number
  severityScore: number
  severityLabel: SeverityLabel
  topicId?: number | null // NMF theme id; absent/null until the analytics build runs
  eventClusterId?: number | null // event/outbreak cluster id; absent/null until events are built
  entities: RecallEntity[]
}

export type RecallEntity = { type: EntityType; value: string }

export type RecallListResult = {
  items: Recall[]
  total: number
}

// Analytics (Phase 2): a discovered theme and a recall's nearest neighbour.
export type TopicOut = { id: number; slug: string; label: string; topTerms: string[]; size: number }
export type SimilarRecall = { similarity: number; recall: Recall }
// A recall cluster: recalls grouped into one incident. Outbreaks are the high-signal pathogen ones.
export type EventOut = {
  id: number
  slug: string
  label: string
  isOutbreak: boolean
  dominantEntity: string | null
  recallCount: number
  companyCount: number
  stateCount: number
  firstDate: string | null
  lastDate: string | null
  severityMax: number
}

export type CategoryCount = { category: RecallCategory; count: number }
export type MonthCount = { month: string; count: number } // month is 'YYYY-MM'
export type LabelCount = { label: string; count: number }
export type EntityCount = { type: EntityType; label: string; count: number }

// A single flagged month. z carries the direction (+ spike, − dip); magnitude is the robust z-score.
export type AnomalyMonth = { month: string; observed: number; baseline: number; z: number }

// One "thing" (overall / a category / an entity) with every month flagged as unusual, consolidated
// so a single card + chart shows all its outliers.
export type Anomaly = {
  scope: AnomalyScope
  label: string
  months: AnomalyMonth[]
  series: MonthCount[] // monthly counts over the displayed window, for the chart
}

// A projected month of overall recall volume with a ~1σ band. A projection, not a record — the
// counterpart to an anomaly (which only ever describes the past).
export type ForecastPoint = { month: string; predicted: number; lower: number; upper: number }

export type RecallStats = {
  total: number
  byCategory: CategoryCount[]
  byMonth: MonthCount[]
  byClassification: LabelCount[]
  bySeverity: LabelCount[]
  byState: LabelCount[]
  byCompany: LabelCount[]
  bySource: LabelCount[]
  byEntity: EntityCount[]
  anomalies: Anomaly[]
  // Short-horizon projection of overall volume; empty when history is too short to forecast.
  forecast: ForecastPoint[]
  lastIngestAt: string | null
}

// Per-facet option counts under the current filters (each ignores its own facet's selection). Drives
// the live counts + greyed-out dead ends in the filter dropdowns. Company isn't here — it's a
// type-ahead, fetched with counts from /recalls/companies.
export type RecallFacets = {
  category: LabelCount[]
  classification: LabelCount[]
  severity: LabelCount[]
  source: LabelCount[]
  state: LabelCount[]
  // Also drives the breakdown cards + state map: top firms (capped) and the entity leaderboards.
  company: LabelCount[]
  entity: EntityCount[]
  // Recalls per theme / per outbreak cluster (keyed by surrogate id), so the Themes + Outbreaks
  // lists can drop the ones with no match under the current filters.
  topicCounts: Record<string, number>
  eventCounts: Record<string, number>
}

// Adapt the global stats payload into the faceted shape, so the breakdowns + map can fall back to
// the unfiltered global counts when the live facets aren't loaded yet (or the endpoint is absent).
export const facetsFromStats = (stats: RecallStats): RecallFacets => ({
  category: stats.byCategory.map((entry) => ({ label: entry.category, count: entry.count })),
  classification: stats.byClassification,
  severity: stats.bySeverity,
  source: stats.bySource,
  state: stats.byState,
  company: stats.byCompany,
  entity: stats.byEntity,
  // The global stats carry no per-theme/outbreak counts; left empty since the Themes + Outbreaks
  // lists read these only from the live facets (and fall back to showing everything without them).
  topicCounts: {},
  eventCounts: {},
})

// Read a per-id facet count (a theme or outbreak cluster), coercing the surrogate id to the string
// key the backend tallies under. Zero when the id has no recalls in the current filter set.
export const countFor = (counts: Record<string, number>, id: number): number =>
  counts[String(id)] ?? 0

// Long-format monthly counts for the groupable trend chart. group is a category/source value,
// or 'total' when ungrouped.
export type TrendBucket = { month: string; group: string; count: number }
export type TrendResult = { group: TrendGroup; buckets: TrendBucket[] }

// Runtime guards for untrusted backend payloads — validate the shapes the UI reads rather than
// casting. Small combinators compose into one declarative guard per DTO, so each shape is described
// once instead of re-listed field by field.
type Guard<T> = (value: unknown) => value is T

const isString: Guard<string> = (value): value is string => typeof value === 'string'
const isNumber: Guard<number> = (value): value is number => typeof value === 'number'
const isBoolean: Guard<boolean> = (value): value is boolean => typeof value === 'boolean'
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Wrap a guard to admit null / undefined, lift it over arrays or string-keyed records, or check
// membership in a const-object enum (its values, e.g. oneOf(RecallCategory)).
const nullable =
  <T>(guard: Guard<T>): Guard<T | null> =>
  (value): value is T | null =>
    value === null || guard(value)
const optional =
  <T>(guard: Guard<T>): Guard<T | undefined> =>
  (value): value is T | undefined =>
    value === undefined || guard(value)
const arrayOf =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (value): value is T[] =>
    Array.isArray(value) && value.every(guard)
const nonEmptyArrayOf =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (value): value is T[] =>
    Array.isArray(value) && value.length > 0 && value.every(guard)
const recordOf =
  <T>(guard: Guard<T>): Guard<Record<string, T>> =>
  (value): value is Record<string, T> =>
    isRecord(value) && Object.values(value).every(guard)
const oneOf = <T extends string>(values: Record<string, T>): Guard<T> => {
  const allowed = new Set<string>(Object.values(values))
  return (value): value is T => typeof value === 'string' && allowed.has(value)
}
// Every listed key must satisfy its guard; extra keys are ignored (we validate only what the UI
// reads). Works for any DTO whose fields each have a guard.
const object =
  <T extends Record<string, unknown>>(shape: { [K in keyof T]-?: Guard<T[K]> }): Guard<T> =>
  (value): value is T =>
    isRecord(value) &&
    (Object.keys(shape) as (keyof T)[]).every((key) => shape[key](value[key as string]))

export const isRecallCategory = oneOf(RecallCategory)
export const isRecallClass = oneOf(RecallClass)
export const isRecallSource = oneOf(RecallSource)
export const isRecallCountry = oneOf(RecallCountry)
export const isEntityType = oneOf(EntityType)
export const isTrendGroup = oneOf(TrendGroup)
export const isSeverityLabel = oneOf(SeverityLabel)
export const isRecallSort = oneOf(RecallSort)
const isAnomalyScope = oneOf(AnomalyScope)

// A 'YYYY-MM-DD' calendar date — the shape the date filters and the backend expect. Guards the
// raw `since`/`until` URL params so a malformed value can't reach the API or break year derivation.
export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

const isLabelCount = object<LabelCount>({ label: isString, count: isNumber })
const isCategoryCount = object<CategoryCount>({ category: isRecallCategory, count: isNumber })
const isMonthCount = object<MonthCount>({ month: isString, count: isNumber })
const isEntityCount = object<EntityCount>({ type: isEntityType, label: isString, count: isNumber })
const isRecallEntity = object<RecallEntity>({ type: isEntityType, value: isString })
const isForecastPoint = object<ForecastPoint>({
  month: isString,
  predicted: isNumber,
  lower: isNumber,
  upper: isNumber,
})

const isTrendBucket = object<TrendBucket>({ month: isString, group: isString, count: isNumber })
export const isTrendResult = object<TrendResult>({
  group: isTrendGroup,
  buckets: arrayOf(isTrendBucket),
})

const isAnomalyMonth = object<AnomalyMonth>({
  month: isString,
  observed: isNumber,
  baseline: isNumber,
  z: isNumber,
})
const isAnomaly = object<Anomaly>({
  scope: isAnomalyScope,
  label: isString,
  months: nonEmptyArrayOf(isAnomalyMonth),
  series: arrayOf(isMonthCount),
})

export const isRecall = object<Recall>({
  country: isRecallCountry,
  source: isRecallSource,
  recallNumber: isString,
  sourceUrl: nullable(isString),
  status: nullable(isString),
  classification: nullable(isRecallClass),
  productDescription: isString,
  reasonText: isString,
  companyName: nullable(isString),
  state: nullable(isString),
  distributionPattern: nullable(isString),
  recallInitiationDate: nullable(isString),
  reportDate: nullable(isString),
  category: isRecallCategory,
  categoryConfidence: isNumber,
  severityScore: isNumber,
  severityLabel: isSeverityLabel,
  // Tolerant: absent (older payloads / fixtures), null (not yet built), or a number.
  topicId: optional(nullable(isNumber)),
  eventClusterId: optional(nullable(isNumber)),
  entities: arrayOf(isRecallEntity),
})

export const isRecallListResult = object<RecallListResult>({
  items: arrayOf(isRecall),
  total: isNumber,
})

export const isTopicOut = object<TopicOut>({
  id: isNumber,
  slug: isString,
  label: isString,
  topTerms: arrayOf(isString),
  size: isNumber,
})
export const isTopicOutArray = arrayOf(isTopicOut)

export const isEventOut = object<EventOut>({
  id: isNumber,
  slug: isString,
  label: isString,
  isOutbreak: isBoolean,
  dominantEntity: nullable(isString),
  recallCount: isNumber,
  companyCount: isNumber,
  stateCount: isNumber,
  firstDate: nullable(isString),
  lastDate: nullable(isString),
  severityMax: isNumber,
})
export const isEventOutArray = arrayOf(isEventOut)

const isSimilarRecall = object<SimilarRecall>({ similarity: isNumber, recall: isRecall })
export const isSimilarRecallArray = arrayOf(isSimilarRecall)

export const isRecallStats = object<RecallStats>({
  total: isNumber,
  byCategory: arrayOf(isCategoryCount),
  byMonth: arrayOf(isMonthCount),
  byClassification: arrayOf(isLabelCount),
  bySeverity: arrayOf(isLabelCount),
  byState: arrayOf(isLabelCount),
  byCompany: arrayOf(isLabelCount),
  bySource: arrayOf(isLabelCount),
  byEntity: arrayOf(isEntityCount),
  anomalies: arrayOf(isAnomaly),
  forecast: arrayOf(isForecastPoint),
  lastIngestAt: nullable(isString),
})

export const isLabelCountArray = arrayOf(isLabelCount)

export const isRecallFacets = object<RecallFacets>({
  category: arrayOf(isLabelCount),
  classification: arrayOf(isLabelCount),
  severity: arrayOf(isLabelCount),
  source: arrayOf(isLabelCount),
  state: arrayOf(isLabelCount),
  company: arrayOf(isLabelCount),
  entity: arrayOf(isEntityCount),
  topicCounts: recordOf(isNumber),
  eventCounts: recordOf(isNumber),
})
