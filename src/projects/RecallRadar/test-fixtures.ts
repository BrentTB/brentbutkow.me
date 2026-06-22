import type { RecallFacets } from './recall.types'

// All facet dimensions empty — spread it and override only the ones a test needs populated. Adding a
// field to RecallFacets fails tsc here until it's filled in, so the test fixtures can't drift.
export const emptyFacets: RecallFacets = {
  category: [],
  classification: [],
  severity: [],
  source: [],
  state: [],
  company: [],
  entity: [],
  topicCounts: {},
  eventCounts: {},
}
