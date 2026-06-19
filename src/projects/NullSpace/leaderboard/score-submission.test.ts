import { describe, it, expect } from 'vitest'
import { createInitialState, startGame } from '../engine/game-loop'
import { AbilityKind, ShipKind } from '../engine/types'
import { UpgradeId } from '../engine/upgrade-ids'
import { GAME_VERSION } from '../data'
import { buildScoreSubmission, sanitizeName, MAX_NAME_LENGTH } from './score-submission'

describe('sanitizeName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeName('  ACE  ')).toBe('ACE')
  })

  it('caps length at MAX_NAME_LENGTH', () => {
    expect(sanitizeName('x'.repeat(MAX_NAME_LENGTH + 10))).toHaveLength(MAX_NAME_LENGTH)
  })

  it('collapses internal whitespace to single spaces', () => {
    expect(sanitizeName('A\tcool\n\nname')).toBe('A cool name')
  })

  it('strips control and zero-width characters', () => {
    expect(sanitizeName('A\u0000B\u200BC')).toBe('ABC')
  })
})

describe('buildScoreSubmission', () => {
  function finishedRun() {
    return {
      ...startGame(createInitialState(), ShipKind.fighter),
      score: 1234.7,
      kills: 42,
      wave: 9,
      level: 3,
      currency: 50.9,
      spaceMetal: 7,
      ultimatesOwned: [AbilityKind.cometShower, AbilityKind.meteorShower],
    }
  }

  it('stamps the current game version', () => {
    expect(buildScoreSubmission(finishedRun(), 'ACE', 60000).version).toBe(GAME_VERSION)
  })

  it('floors fractional score/currency and clamps a negative duration to 0', () => {
    const sub = buildScoreSubmission(finishedRun(), 'ACE', -5)
    expect(sub.score).toBe(1234)
    expect(sub.currency).toBe(50)
    expect(sub.durationMs).toBe(0)
  })

  it('carries the run stats the server cross-checks, with the name sanitized', () => {
    const sub = buildScoreSubmission(finishedRun(), '  ACE  ', 60000)
    expect(sub.name).toBe('ACE')
    expect(sub.kills).toBe(42)
    expect(sub.wave).toBe(9)
    expect(sub.shipKind).toBe(ShipKind.fighter)
    expect(sub.ultimatesOwned).toBe(2)
  })

  it('sums upgrade tiers bought into upgradesPurchased', () => {
    const state = {
      ...startGame(createInitialState(), ShipKind.fighter),
      upgrades: {
        ...startGame(createInitialState(), ShipKind.fighter).upgrades,
        [UpgradeId.meteoriteDamage]: { currentTier: 3 },
      },
    }
    expect(buildScoreSubmission(state, 'ACE', 1000).upgradesPurchased).toBe(3)
  })
})
