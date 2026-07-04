import { describe, expect, it } from 'vitest'
import { predictedClassLabel } from './data'
import {
  PredictedClass,
  RecallCategory,
  RecallCountry,
  RecallSource,
  SeverityLabel,
  type Recall,
} from './recall.types'

const baseRecall: Recall = {
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

describe('predictedClassLabel', () => {
  it('returns null when no class is predicted', () => {
    expect(predictedClassLabel({ ...baseRecall, predictedClass: null })).toBeNull()
    expect(predictedClassLabel(baseRecall)).toBeNull()
  })

  it('returns null for a predicted non-Class I (not worth surfacing)', () => {
    expect(
      predictedClassLabel({
        ...baseRecall,
        predictedClass: PredictedClass.notClassI,
        predictedClassConfidence: 0.9,
      })
    ).toBeNull()
  })

  it('omits the percentage when confidence is unknown', () => {
    expect(
      predictedClassLabel({
        ...baseRecall,
        predictedClass: PredictedClass.classI,
        predictedClassConfidence: null,
      })
    ).toBe('Predicted: Class I')
  })

  it('shows a rounded confidence percentage when known', () => {
    expect(
      predictedClassLabel({
        ...baseRecall,
        predictedClass: PredictedClass.classI,
        predictedClassConfidence: 0.78,
      })
    ).toBe('Predicted: Class I · 78%')
  })

  it('rounds the percentage to the nearest whole', () => {
    expect(
      predictedClassLabel({
        ...baseRecall,
        predictedClass: PredictedClass.classI,
        predictedClassConfidence: 0.775,
      })
    ).toBe('Predicted: Class I · 78%')
  })
})
