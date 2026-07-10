import { describe, expect, it } from 'vitest'
import {
  PredictedClass,
  RecallCategory,
  RecallCountry,
  RecallSource,
  SeverityLabel,
  isPredictedClass,
  isRecall,
} from './recall.types'

// A minimal valid recall, without any of the tolerant optional fields. Spread + override per case.
const baseRecall = {
  country: RecallCountry.uk,
  source: RecallSource.uk,
  recallNumber: 'FSA-1',
  sourceUrl: null,
  status: null,
  classification: null,
  productDescription: 'Cheese',
  reasonText: 'Undeclared milk',
  companyName: null,
  state: null,
  distributionPattern: null,
  recallInitiationDate: null,
  reportDate: '2026-01-01',
  category: RecallCategory.allergen,
  categoryConfidence: 0.9,
  severityScore: 60,
  severityLabel: SeverityLabel.high,
  entities: [],
}

describe('isPredictedClass', () => {
  it('accepts the two model classes', () => {
    expect(isPredictedClass(PredictedClass.classI)).toBe(true)
    expect(isPredictedClass(PredictedClass.notClassI)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isPredictedClass('Class II')).toBe(false)
    expect(isPredictedClass('')).toBe(false)
    expect(isPredictedClass(null)).toBe(false)
  })
})

describe('isRecall — novelty / predicted-class tolerance', () => {
  it('accepts a recall with the new fields absent (older payloads / fixtures)', () => {
    expect(isRecall(baseRecall)).toBe(true)
  })

  it('accepts the new fields as null (present but unscored)', () => {
    expect(
      isRecall({
        ...baseRecall,
        noveltyScore: null,
        predictedClass: null,
        predictedClassConfidence: null,
      })
    ).toBe(true)
  })

  it('accepts populated novelty + predicted-class values', () => {
    expect(
      isRecall({
        ...baseRecall,
        noveltyScore: 0.92,
        predictedClass: PredictedClass.classI,
        predictedClassConfidence: 0.78,
      })
    ).toBe(true)
  })

  it('rejects an unknown predictedClass string', () => {
    expect(isRecall({ ...baseRecall, predictedClass: 'Class I-ish' })).toBe(false)
  })

  it('rejects a non-numeric noveltyScore', () => {
    expect(isRecall({ ...baseRecall, noveltyScore: 'high' })).toBe(false)
  })
})

describe('isRecall — EU geography tolerance', () => {
  it('accepts a populated EU recall (notifying + origin + distribution)', () => {
    expect(
      isRecall({
        ...baseRecall,
        country: RecallCountry.eu,
        source: RecallSource.rasff,
        notifyingCountry: 'IE',
        originCountries: ['ES'],
        distributionCountries: ['IE', 'DE'],
      })
    ).toBe(true)
  })

  it('accepts the geography fields as null or absent (non-EU sources / older fixtures)', () => {
    expect(isRecall(baseRecall)).toBe(true)
    expect(
      isRecall({
        ...baseRecall,
        notifyingCountry: null,
        originCountries: null,
        distributionCountries: null,
      })
    ).toBe(true)
  })

  it('rejects a non-string-list distributionCountries', () => {
    expect(isRecall({ ...baseRecall, distributionCountries: 'IE, DE' })).toBe(false)
    expect(isRecall({ ...baseRecall, originCountries: [1, 2] })).toBe(false)
  })
})
