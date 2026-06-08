import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadHighScore,
  saveHighScore,
  loadChangelogFilters,
  saveChangelogFilters,
  DEFAULT_CHANGELOG_FILTERS,
} from './persistence'

beforeEach(() => {
  localStorage.clear()
})

describe('loadHighScore', () => {
  it('returns 0 when no score saved', () => {
    expect(loadHighScore()).toBe(0)
  })

  it('returns the saved score', () => {
    localStorage.setItem('null-space-high-score', '42')
    expect(loadHighScore()).toBe(42)
  })

  it('returns 0 for invalid data', () => {
    localStorage.setItem('null-space-high-score', 'not-a-number')
    expect(loadHighScore()).toBe(0)
  })

  it('returns 0 for negative scores', () => {
    localStorage.setItem('null-space-high-score', '-10')
    expect(loadHighScore()).toBe(0)
  })
})

describe('saveHighScore', () => {
  it('saves when score is higher than current', () => {
    saveHighScore(100)
    expect(loadHighScore()).toBe(100)
  })

  it('does not overwrite higher existing score', () => {
    saveHighScore(200)
    saveHighScore(50)
    expect(loadHighScore()).toBe(200)
  })

  it('floors the score', () => {
    saveHighScore(99.7)
    expect(loadHighScore()).toBe(99)
  })
})

describe('loadChangelogFilters', () => {
  it('returns defaults when nothing stored', () => {
    expect(loadChangelogFilters()).toEqual(DEFAULT_CHANGELOG_FILTERS)
  })

  it('defaults architecture to false (hidden by default)', () => {
    expect(DEFAULT_CHANGELOG_FILTERS.architecture).toBe(false)
  })

  it('defaults all other categories to true', () => {
    expect(DEFAULT_CHANGELOG_FILTERS.breaking).toBe(true)
    expect(DEFAULT_CHANGELOG_FILTERS.features).toBe(true)
    expect(DEFAULT_CHANGELOG_FILTERS.balance).toBe(true)
    expect(DEFAULT_CHANGELOG_FILTERS.fixes).toBe(true)
    expect(DEFAULT_CHANGELOG_FILTERS.ui).toBe(true)
  })

  it('falls back to defaults on malformed JSON', () => {
    localStorage.setItem('null-space-changelog-filters', '{not valid json')
    expect(loadChangelogFilters()).toEqual(DEFAULT_CHANGELOG_FILTERS)
  })

  it('falls back to defaults when stored shape is wrong', () => {
    localStorage.setItem('null-space-changelog-filters', JSON.stringify({ foo: 1 }))
    expect(loadChangelogFilters()).toEqual(DEFAULT_CHANGELOG_FILTERS)
  })
})

describe('saveChangelogFilters', () => {
  it('round-trips a custom filter set', () => {
    const filters = {
      breaking: false,
      features: true,
      balance: false,
      fixes: true,
      ui: false,
      architecture: true,
    }
    saveChangelogFilters(filters)
    expect(loadChangelogFilters()).toEqual(filters)
  })
})
