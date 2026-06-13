import { describe, expect, it } from 'vitest'
import { buildRecallsPath } from './api'
import { RecallCategory, RecallClass } from './recall.types'

describe('buildRecallsPath', () => {
  it('defaults the limit and omits unset filters', () => {
    expect(buildRecallsPath({})).toBe('/recalls?limit=50')
  })

  it('encodes every provided filter', () => {
    const path = buildRecallsPath({
      category: RecallCategory.pathogen,
      classification: RecallClass.classI,
      since: '2026-01-01',
      limit: 25,
    })
    expect(path).toContain('category=pathogen')
    expect(path).toContain('classification=Class+I')
    expect(path).toContain('since=2026-01-01')
    expect(path).toContain('limit=25')
  })
})
