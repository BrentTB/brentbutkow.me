import { afterEach, describe, expect, it } from 'vitest'
import { clearVisitedHistory, previousVisitedPath, recordVisit } from './navigation-history'

const setHistoryIndex = (idx: number | null) =>
  Object.defineProperty(window.history, 'state', {
    configurable: true,
    value: idx === null ? null : { idx },
  })

describe('navigation-history', () => {
  afterEach(() => {
    clearVisitedHistory()
    setHistoryIndex(null)
  })

  it('returns the path recorded at the previous history index', () => {
    setHistoryIndex(0)
    recordVisit('/projects')
    setHistoryIndex(1)
    recordVisit('/projects/recall-radar')

    expect(previousVisitedPath()).toBe('/projects')
  })

  it('returns undefined when the previous index was never recorded', () => {
    setHistoryIndex(0)
    recordVisit('/')

    expect(previousVisitedPath()).toBeUndefined()
  })

  it('stays correct after navigating back (index decremented)', () => {
    setHistoryIndex(0)
    recordVisit('/a')
    setHistoryIndex(1)
    recordVisit('/b')
    setHistoryIndex(2)
    recordVisit('/c')

    setHistoryIndex(1) // went back to /b; its previous is still /a
    expect(previousVisitedPath()).toBe('/a')
  })
})
