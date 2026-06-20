import { describe, expect, it } from 'vitest'
import { buildRecallsPath, buildTrendPath } from './api'
import { RecallCategory, RecallClass, RecallSort, TrendGroup } from './recall.types'

describe('buildRecallsPath', () => {
  it('defaults the limit and omits unset filters', () => {
    expect(buildRecallsPath({})).toBe('/recalls?limit=50')
  })

  it('encodes every provided filter', () => {
    const path = buildRecallsPath({
      category: RecallCategory.pathogen,
      classification: RecallClass.classI,
      state: 'CA',
      entity: 'peanuts',
      search: 'listeria',
      since: '2025-01-01',
      until: '2025-06-30',
      limit: 25,
      offset: 50,
    })
    expect(path).toContain('category=pathogen')
    expect(path).toContain('classification=Class+I')
    expect(path).toContain('state=CA')
    expect(path).toContain('entity=peanuts')
    expect(path).toContain('search=listeria')
    expect(path).toContain('since=2025-01-01')
    expect(path).toContain('until=2025-06-30')
    expect(path).toContain('limit=25')
    expect(path).toContain('offset=50')
  })

  it('omits offset when it is zero (the first page)', () => {
    expect(buildRecallsPath({ offset: 0 })).toBe('/recalls?limit=50')
  })

  it('sets sort when provided and omits it by default', () => {
    expect(buildRecallsPath({ sort: RecallSort.severity })).toContain('sort=severity')
    expect(buildRecallsPath({})).not.toContain('sort')
  })
})

describe('buildTrendPath', () => {
  it('sets the group and shared filters', () => {
    const path = buildTrendPath(
      { category: RecallCategory.pathogen, since: '2025-01-01' },
      TrendGroup.category
    )
    expect(path).toContain('/recalls/trend')
    expect(path).toContain('group=category')
    expect(path).toContain('category=pathogen')
    expect(path).toContain('since=2025-01-01')
  })

  it('never emits pagination params', () => {
    const path = buildTrendPath({ search: 'listeria' }, TrendGroup.total)
    expect(path).not.toContain('limit')
    expect(path).not.toContain('offset')
  })
})
