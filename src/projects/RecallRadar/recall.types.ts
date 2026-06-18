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
} as const
export type TrendGroup = (typeof TrendGroup)[keyof typeof TrendGroup]

// UI filter state — '' means "no filter".
export type RecallFilterValues = {
  category: RecallCategory | ''
  classification: RecallClass | ''
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
  entities: RecallEntity[]
}

export type RecallEntity = { type: EntityType; value: string }

export type RecallListResult = {
  items: Recall[]
  total: number
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

export type RecallStats = {
  total: number
  byCategory: CategoryCount[]
  byMonth: MonthCount[]
  byClassification: LabelCount[]
  byState: LabelCount[]
  byCompany: LabelCount[]
  bySource: LabelCount[]
  byEntity: EntityCount[]
  anomalies: Anomaly[]
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

export const isRecallStats = (value: unknown): value is RecallStats =>
  isRecord(value) &&
  typeof value.total === 'number' &&
  Array.isArray(value.byCategory) &&
  value.byCategory.every(isCategoryCount) &&
  Array.isArray(value.byMonth) &&
  value.byMonth.every(isMonthCount) &&
  Array.isArray(value.byClassification) &&
  value.byClassification.every(isLabelCount) &&
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
  isStringOrNull(value.lastIngestAt)
