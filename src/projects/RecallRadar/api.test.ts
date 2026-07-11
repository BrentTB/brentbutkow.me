import { describe, expect, it } from 'vitest'
import {
  buildCompaniesPath,
  buildFacetsPath,
  buildRecallsPath,
  buildSimilarPath,
  buildTrendPath,
  recallRadarFilterRoute,
} from './api'
import {
  RecallCategory,
  RecallClass,
  RecallSort,
  RecallSource,
  SeverityLabel,
  TrendGroup,
} from './recall.types'

describe('buildRecallsPath', () => {
  it('defaults the limit and omits unset filters', () => {
    expect(buildRecallsPath({})).toBe('/recalls?limit=50')
  })

  it('encodes every provided filter', () => {
    const path = buildRecallsPath({
      category: RecallCategory.pathogen,
      classification: RecallClass.classI,
      severity: SeverityLabel.severe,
      topic: 'listeria-deli-meat',
      event: 'listeria-2026-03',
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
    expect(path).toContain('severity=severe')
    expect(path).toContain('topic=listeria-deli-meat')
    expect(path).toContain('event=listeria-2026-03')
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
    expect(buildRecallsPath({ sort: RecallSort.novelty })).toContain('sort=novelty')
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

describe('buildFacetsPath', () => {
  it('sets the shared filters and never paginates', () => {
    const path = buildFacetsPath({ category: RecallCategory.pathogen, state: 'CA' })
    expect(path).toContain('/recalls/facets')
    expect(path).toContain('category=pathogen')
    expect(path).toContain('state=CA')
    expect(path).not.toContain('limit')
    expect(path).not.toContain('offset')
  })
})

describe('buildCompaniesPath', () => {
  it('drops the company facet (its own dimension) and url-encodes the query', () => {
    const path = buildCompaniesPath(
      { company: 'Acme', category: RecallCategory.allergen },
      'b & b foods'
    )
    expect(path).toContain('/recalls/companies')
    expect(path).not.toContain('company=') // company is the facet's own dimension → dropped
    expect(path).toContain('category=allergen')
    expect(path).toContain('q=b+%26+b+foods')
  })

  it('omits q for an empty query', () => {
    expect(buildCompaniesPath({ country: 'us' }, '')).not.toContain('q=')
  })
})

describe('buildSimilarPath', () => {
  it('builds an encoded similar path with the limit', () => {
    expect(buildSimilarPath(RecallSource.fda, 'F-1234', 6)).toBe(
      '/recalls/fda/F-1234/similar?limit=6'
    )
  })

  it('encodes recall numbers with special characters and defaults the limit', () => {
    expect(buildSimilarPath(RecallSource.usda, '007/2026')).toBe(
      '/recalls/usda/007%2F2026/similar?limit=6'
    )
  })
})

describe('recallRadarFilterRoute', () => {
  // Theme/outbreak chips land on the Recalls list, not the dashboard, so members show immediately.
  it('targets the recalls view with the country and filter slug', () => {
    expect(recallRadarFilterRoute('us', 'event', 'listeria-2026')).toBe(
      '/projects/recall-radar?location=us&view=recalls&event=listeria-2026'
    )
    expect(recallRadarFilterRoute('uk', 'topic', 'allergens')).toBe(
      '/projects/recall-radar?location=uk&view=recalls&topic=allergens'
    )
  })
})
