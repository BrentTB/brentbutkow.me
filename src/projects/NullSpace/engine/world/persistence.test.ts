import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadHighScore,
  saveHighScore,
  loadChangelogFilters,
  saveChangelogFilters,
  DEFAULT_CHANGELOG_FILTERS,
  getVisibleChangelogEntries,
  saveGame,
  loadGame,
  clearSave,
  loadTutorialSeen,
  saveTutorialSeen,
} from './persistence'
import { createInitialState } from '../game-loop'

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

describe('loadTutorialSeen / saveTutorialSeen', () => {
  it('returns false when never seen', () => {
    expect(loadTutorialSeen()).toBe(false)
  })

  it('returns true after marking seen', () => {
    saveTutorialSeen()
    expect(loadTutorialSeen()).toBe(true)
  })

  it('returns false for any other stored value', () => {
    localStorage.setItem('null-space-tutorial-seen', 'yes')
    expect(loadTutorialSeen()).toBe(false)
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

describe('getVisibleChangelogEntries', () => {
  const sample = [
    { version: '1.0.0', date: '2026-01-01', changes: { features: ['f1'], fixes: ['x1'] } },
    { version: '0.9.0', date: '2025-12-01', changes: { balance: ['b1'] } },
  ]
  const allOff = {
    breaking: false,
    features: false,
    balance: false,
    fixes: false,
    ui: false,
    architecture: false,
  }

  // Regression: with every filter off the old inline logic returned null per
  // entry, collapsing the changelog panel and trapping the filter menu. The
  // empty list is what now drives the UI's empty state instead.
  it('returns an empty list when all filters are off', () => {
    expect(getVisibleChangelogEntries(sample, allOff)).toEqual([])
  })

  it('keeps only the enabled categories that have items', () => {
    const result = getVisibleChangelogEntries(sample, { ...allOff, features: true })
    expect(result).toHaveLength(1)
    expect(result[0].version).toBe('1.0.0')
    expect(result[0].groups.map((g) => g.key)).toEqual(['features'])
    expect(result[0].groups[0].items).toEqual(['f1'])
  })

  it('drops entries left with no visible groups', () => {
    const result = getVisibleChangelogEntries(sample, { ...allOff, balance: true })
    expect(result.map((e) => e.version)).toEqual(['0.9.0'])
  })
})

describe('saveGame / loadGame / clearSave', () => {
  it('round-trips the game state and rng state', () => {
    const state = createInitialState()
    saveGame(state, 123456)
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded?.rngState).toBe(123456)
    expect(loaded?.state.phase).toBe(state.phase)
    expect(loaded?.state.ship.maxHp).toBe(state.ship.maxHp)
  })

  it('returns null when nothing is saved', () => {
    expect(loadGame()).toBeNull()
  })

  it('clearSave removes the save', () => {
    saveGame(createInitialState(), 1)
    clearSave()
    expect(loadGame()).toBeNull()
  })

  it('discards a corrupt or wrong-shape blob', () => {
    localStorage.setItem('null-space-save', '{not json')
    expect(loadGame()).toBeNull()
    localStorage.setItem(
      'null-space-save',
      JSON.stringify({ version: 1, rngState: 1, state: { foo: 1 } })
    )
    expect(loadGame()).toBeNull()
  })

  it('discards a save from an incompatible version', () => {
    const state = createInitialState()
    localStorage.setItem('null-space-save', JSON.stringify({ version: 999, rngState: 1, state }))
    expect(loadGame()).toBeNull()
  })

  it('migrates a pre-grouping save (flat spawn fields) into state.spawn', () => {
    // Write a current-version save, then rewrite its state in the old flat shape
    // (no `spawn`) to simulate a run saved before the spawn fields were grouped.
    saveGame(createInitialState(), 1)
    const raw = JSON.parse(localStorage.getItem('null-space-save')!) as {
      version: number
      rngState: number
      state: Record<string, unknown>
    }
    const legacy: Record<string, unknown> = {
      ...raw.state,
      waveTimer: 5,
      spawnQueue: ['drone'],
      spawnTimer: 1,
      totalWaveEnemies: 7,
      spawnedInWave: 3,
      waveElapsed: 2,
    }
    delete legacy.spawn
    localStorage.setItem('null-space-save', JSON.stringify({ ...raw, state: legacy }))

    expect(loadGame()?.state.spawn).toEqual({
      waveTimer: 5,
      queue: ['drone'],
      timer: 1,
      total: 7,
      spawned: 3,
      elapsed: 2,
    })
  })
})
