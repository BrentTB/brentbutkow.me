import { describe, it, expect } from 'vitest'
import { legacyRecallRadarTarget } from './routes.config'

// Recall Radar moved from /recall-radar to /projects/recall-radar; saved deep links must still land.
describe('legacyRecallRadarTarget', () => {
  it('rewrites a deep recall-detail link, preserving the sub-path', () => {
    expect(legacyRecallRadarTarget('/recall-radar/uk/FSA-PRIN-13-2019', '', '')).toBe(
      '/projects/recall-radar/uk/FSA-PRIN-13-2019'
    )
  })

  it('keeps the query string and hash intact', () => {
    expect(legacyRecallRadarTarget('/recall-radar', '?location=uk&topic=listeria', '#trends')).toBe(
      '/projects/recall-radar?location=uk&topic=listeria#trends'
    )
  })
})
