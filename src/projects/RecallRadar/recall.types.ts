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
} as const
export type RecallSource = (typeof RecallSource)[keyof typeof RecallSource]

export const RecallCountry = {
  us: 'us',
  uk: 'uk',
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

// Long-format monthly counts for the groupable trend chart. group is a category/source value,
// or 'total' when ungrouped.
export type TrendBucket = { month: string; group: string; count: number }
export type TrendResult = { group: TrendGroup; buckets: TrendBucket[] }

// Runtime guards for untrusted backend payloads — validate the shapes the UI reads
// rather than casting (mirrors `isJokeType`).
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

export const isRecallCategory = (value: string): value is RecallCategory =>
  (Object.values(RecallCategory) as string[]).includes(value)

export const isRecallClass = (value: string): value is RecallClass =>
  (Object.values(RecallClass) as string[]).includes(value)

export const isRecallSource = (value: string): value is RecallSource =>
  (Object.values(RecallSource) as string[]).includes(value)

export const isRecallCountry = (value: string): value is RecallCountry =>
  (Object.values(RecallCountry) as string[]).includes(value)

export const isEntityType = (value: string): value is EntityType =>
  (Object.values(EntityType) as string[]).includes(value)

export const isTrendGroup = (value: string): value is TrendGroup =>
  (Object.values(TrendGroup) as string[]).includes(value)

export const isSeverityLabel = (value: string): value is SeverityLabel =>
  (Object.values(SeverityLabel) as string[]).includes(value)

export const isRecallSort = (value: string): value is RecallSort =>
  (Object.values(RecallSort) as string[]).includes(value)

// A 'YYYY-MM-DD' calendar date — the shape the date filters and the backend expect. Guards the
// raw `since`/`until` URL params so a malformed value can't reach the API or break year derivation.
export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

const isTrendBucket = (value: unknown): value is TrendBucket =>
  isRecord(value) &&
  typeof value.month === 'string' &&
  typeof value.group === 'string' &&
  typeof value.count === 'number'

export const isTrendResult = (value: unknown): value is TrendResult =>
  isRecord(value) &&
  typeof value.group === 'string' &&
  isTrendGroup(value.group) &&
  Array.isArray(value.buckets) &&
  value.buckets.every(isTrendBucket)

const isLabelCount = (value: unknown): value is LabelCount =>
  isRecord(value) && typeof value.label === 'string' && typeof value.count === 'number'

const isCategoryCount = (value: unknown): value is CategoryCount =>
  isRecord(value) && typeof value.category === 'string' && typeof value.count === 'number'

const isMonthCount = (value: unknown): value is MonthCount =>
  isRecord(value) && typeof value.month === 'string' && typeof value.count === 'number'

const isRecallEntity = (value: unknown): value is RecallEntity =>
  isRecord(value) &&
  typeof value.type === 'string' &&
  isEntityType(value.type) &&
  typeof value.value === 'string'

const isEntityCount = (value: unknown): value is EntityCount =>
  isRecord(value) &&
  typeof value.type === 'string' &&
  isEntityType(value.type) &&
  typeof value.label === 'string' &&
  typeof value.count === 'number'

const isAnomalyMonth = (value: unknown): value is AnomalyMonth =>
  isRecord(value) &&
  typeof value.month === 'string' &&
  typeof value.observed === 'number' &&
  typeof value.baseline === 'number' &&
  typeof value.z === 'number'

const isAnomaly = (value: unknown): value is Anomaly =>
  isRecord(value) &&
  typeof value.scope === 'string' &&
  typeof value.label === 'string' &&
  Array.isArray(value.months) &&
  value.months.length > 0 &&
  value.months.every(isAnomalyMonth) &&
  Array.isArray(value.series) &&
  value.series.every(isMonthCount)

const isForecastPoint = (value: unknown): value is ForecastPoint =>
  isRecord(value) &&
  typeof value.month === 'string' &&
  typeof value.predicted === 'number' &&
  typeof value.lower === 'number' &&
  typeof value.upper === 'number'

const isRecall = (value: unknown): value is Recall =>
  isRecord(value) &&
  typeof value.recallNumber === 'string' &&
  typeof value.source === 'string' &&
  isRecallSource(value.source) &&
  typeof value.country === 'string' &&
  isRecallCountry(value.country) &&
  typeof value.productDescription === 'string' &&
  typeof value.reasonText === 'string' &&
  typeof value.category === 'string' &&
  typeof value.categoryConfidence === 'number' &&
  typeof value.severityScore === 'number' &&
  typeof value.severityLabel === 'string' &&
  isSeverityLabel(value.severityLabel) &&
  // topicId is tolerant — absent (older payloads/fixtures) or null (not yet built) or a number.
  (value.topicId === undefined || value.topicId === null || typeof value.topicId === 'number') &&
  // eventClusterId is tolerant the same way.
  (value.eventClusterId === undefined ||
    value.eventClusterId === null ||
    typeof value.eventClusterId === 'number') &&
  isStringOrNull(value.status) &&
  isStringOrNull(value.classification) &&
  isStringOrNull(value.companyName) &&
  isStringOrNull(value.state) &&
  isStringOrNull(value.distributionPattern) &&
  isStringOrNull(value.recallInitiationDate) &&
  isStringOrNull(value.reportDate) &&
  isStringOrNull(value.sourceUrl) &&
  Array.isArray(value.entities) &&
  value.entities.every(isRecallEntity)

export const isRecallListResult = (value: unknown): value is RecallListResult =>
  isRecord(value) &&
  typeof value.total === 'number' &&
  Array.isArray(value.items) &&
  value.items.every(isRecall)

export const isTopicOut = (value: unknown): value is TopicOut =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.slug === 'string' &&
  typeof value.label === 'string' &&
  Array.isArray(value.topTerms) &&
  value.topTerms.every((term) => typeof term === 'string') &&
  typeof value.size === 'number'

export const isTopicOutArray = (value: unknown): value is TopicOut[] =>
  Array.isArray(value) && value.every(isTopicOut)

export const isEventOut = (value: unknown): value is EventOut =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.slug === 'string' &&
  typeof value.label === 'string' &&
  typeof value.isOutbreak === 'boolean' &&
  (value.dominantEntity === null || typeof value.dominantEntity === 'string') &&
  typeof value.recallCount === 'number' &&
  typeof value.companyCount === 'number' &&
  typeof value.stateCount === 'number' &&
  isStringOrNull(value.firstDate) &&
  isStringOrNull(value.lastDate) &&
  typeof value.severityMax === 'number'

export const isEventOutArray = (value: unknown): value is EventOut[] =>
  Array.isArray(value) && value.every(isEventOut)

const isSimilarRecall = (value: unknown): value is SimilarRecall =>
  isRecord(value) && typeof value.similarity === 'number' && isRecall(value.recall)

export const isSimilarRecallArray = (value: unknown): value is SimilarRecall[] =>
  Array.isArray(value) && value.every(isSimilarRecall)

export const isRecallStats = (value: unknown): value is RecallStats =>
  isRecord(value) &&
  typeof value.total === 'number' &&
  Array.isArray(value.byCategory) &&
  value.byCategory.every(isCategoryCount) &&
  Array.isArray(value.byMonth) &&
  value.byMonth.every(isMonthCount) &&
  Array.isArray(value.byClassification) &&
  value.byClassification.every(isLabelCount) &&
  Array.isArray(value.bySeverity) &&
  value.bySeverity.every(isLabelCount) &&
  Array.isArray(value.byState) &&
  value.byState.every(isLabelCount) &&
  Array.isArray(value.byCompany) &&
  value.byCompany.every(isLabelCount) &&
  Array.isArray(value.bySource) &&
  value.bySource.every(isLabelCount) &&
  Array.isArray(value.byEntity) &&
  value.byEntity.every(isEntityCount) &&
  Array.isArray(value.anomalies) &&
  value.anomalies.every(isAnomaly) &&
  Array.isArray(value.forecast) &&
  value.forecast.every(isForecastPoint) &&
  isStringOrNull(value.lastIngestAt)
