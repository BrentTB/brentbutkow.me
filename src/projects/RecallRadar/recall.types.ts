// Mirrors the backend DTOs. Derived enums — values double as runtime identifiers.
export const RecallCategory = {
  allergen: 'allergen',
  pathogen: 'pathogen',
  foreignMaterial: 'foreignMaterial',
  mislabeling: 'mislabeling',
  other: 'other',
} as const
export type RecallCategory = (typeof RecallCategory)[keyof typeof RecallCategory]

export const RecallClass = {
  classI: 'Class I',
  classII: 'Class II',
  classIII: 'Class III',
} as const
export type RecallClass = (typeof RecallClass)[keyof typeof RecallClass]

// UI filter state — '' means "no filter".
export type RecallFilterValues = {
  category: RecallCategory | ''
  classification: RecallClass | ''
  state: string
  company: string
  search: string
}

export type Recall = {
  recallNumber: string
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
}

export type RecallListResult = {
  items: Recall[]
  total: number
}

export type CategoryCount = { category: RecallCategory; count: number }
export type MonthCount = { month: string; count: number } // month is 'YYYY-MM'
export type LabelCount = { label: string; count: number }

export type RecallStats = {
  total: number
  byCategory: CategoryCount[]
  byMonth: MonthCount[]
  byClassification: LabelCount[]
  byState: LabelCount[]
  byCompany: LabelCount[]
  lastIngestAt: string | null
}

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

const isLabelCount = (value: unknown): value is LabelCount =>
  isRecord(value) && typeof value.label === 'string' && typeof value.count === 'number'

const isCategoryCount = (value: unknown): value is CategoryCount =>
  isRecord(value) && typeof value.category === 'string' && typeof value.count === 'number'

const isMonthCount = (value: unknown): value is MonthCount =>
  isRecord(value) && typeof value.month === 'string' && typeof value.count === 'number'

const isRecall = (value: unknown): value is Recall =>
  isRecord(value) &&
  typeof value.recallNumber === 'string' &&
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
  isStringOrNull(value.reportDate)

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
  isStringOrNull(value.lastIngestAt)
