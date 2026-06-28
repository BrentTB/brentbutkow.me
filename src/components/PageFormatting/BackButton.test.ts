import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRouteFallbackPath, shouldNavigateBack } from './BackButton'

const originalReferrer = document.referrer
const originalHistoryLength = window.history.length
const originalHistoryState = window.history.state

const setHistoryLength = (length: number) => {
  Object.defineProperty(window.history, 'length', {
    configurable: true,
    value: length,
  })
}

const setHistoryState = (state: unknown) => {
  Object.defineProperty(window.history, 'state', {
    configurable: true,
    value: state,
  })
}

const setDocumentReferrer = (referrer: string) => {
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: referrer,
  })
}

describe('getRouteFallbackPath', () => {
  it('returns the parent route for nested paths', () => {
    expect(getRouteFallbackPath('/pages/test/5')).toBe('/pages/test')
    expect(getRouteFallbackPath('/pages/test')).toBe('/pages')
    expect(getRouteFallbackPath('/pages')).toBe('/')
  })

  it('returns undefined for root', () => {
    expect(getRouteFallbackPath('/')).toBeUndefined()
  })
})

describe('shouldNavigateBack', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setDocumentReferrer(originalReferrer)
    setHistoryLength(originalHistoryLength)
    setHistoryState(originalHistoryState)
  })

  it('returns false when there is no previous page', () => {
    setHistoryLength(1)
    setDocumentReferrer('')
    setHistoryState(null)

    expect(shouldNavigateBack()).toBe(false)
  })

  it('returns true when the previous entry is in-app via history index', () => {
    setHistoryLength(2)
    setDocumentReferrer('https://google.com')
    setHistoryState({ idx: 1 })

    expect(shouldNavigateBack()).toBe(true)
  })

  it('returns false for an external referrer when the history index is first entry', () => {
    setHistoryLength(2)
    setDocumentReferrer('https://google.com')
    setHistoryState({ idx: 0 })

    expect(shouldNavigateBack()).toBe(false)
  })

  it('returns true for a same-origin referrer even when the history index is first entry', () => {
    setHistoryLength(2)
    setDocumentReferrer(`${window.location.origin}/some-page`)
    setHistoryState({ idx: 0 })

    expect(shouldNavigateBack()).toBe(true)
  })
})
