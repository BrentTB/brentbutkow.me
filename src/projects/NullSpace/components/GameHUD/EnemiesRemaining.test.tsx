import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EnemiesRemaining } from './EnemiesRemaining'
import {
  ENEMIES_LEFT_THRESHOLD,
  enemiesRemaining,
  shouldShowEnemiesRemaining,
} from './enemies-remaining'
import { GameUIStateProvider } from '../../useGameUIState'
import { AbilityKind, EnemyKind, GamePhase, ShipKind, HelperWeaponKind } from '../../engine/types'
import type { PlayerUpgrades } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'

function makeUiState(over: Partial<GameUIState> = {}): GameUIState {
  return {
    phase: GamePhase.playing,
    shipKind: ShipKind.fighter,
    score: 0,
    highScore: 0,
    isNewHighScore: false,
    kills: 0,
    wave: 1,
    level: 1,
    shipHp: 100,
    shipMaxHp: 100,
    shipShield: 50,
    shipMaxShield: 50,
    shieldCooldownRemaining: 0,
    shipSpeed: 0,
    power: 80,
    maxPower: 100,
    currency: 0,
    spaceMetal: 0,
    singularityShard: 0,
    ultimatesOwned: [],
    abilities: [],
    upgrades: {} as PlayerUpgrades,
    selectedAbility: AbilityKind.meteorite,
    spawnedInWave: 0,
    totalWaveEnemies: 0,
    enemiesAlive: 0,
    speedUpCountdown: null,
    levelUpWeaponOffers: [],
    unlockedWeapons: [HelperWeaponKind.bullet],
    escapeModeActive: false,
    slingHeat: 0,
    slingOverheated: false,
    boss: null,
    nextBoss: EnemyKind.dreadnought,
    bossWarning: null,
    tutorialActive: false,
    tutorialCopy: '',
    tutorialAwaitingAck: false,
    tutorialAckLabel: null,
    tutorialIsFinal: false,
    ...over,
  }
}

function renderRemaining(over: Partial<GameUIState> = {}) {
  return render(
    <GameUIStateProvider value={makeUiState(over)}>
      <EnemiesRemaining />
    </GameUIStateProvider>
  )
}

describe('enemiesRemaining', () => {
  it('counts unspawned plus alive, and treats spawned-minus-alive as dead', () => {
    // 10 total, 8 spawned (2 still queued), 3 alive → 5 dead, so 5 remain.
    expect(enemiesRemaining(10, 8, 3)).toBe(5)
  })

  it('never goes negative', () => {
    expect(enemiesRemaining(3, 3, 0)).toBe(0)
    expect(enemiesRemaining(0, 5, 0)).toBe(0)
  })
})

describe('shouldShowEnemiesRemaining', () => {
  it('stays hidden on a small wave until the first kill', () => {
    // A 4-enemy wave sits below the threshold from the start, but shows nothing
    // until one dies (spawned 4, alive 4 → 0 killed).
    expect(shouldShowEnemiesRemaining(4, 4, 4)).toBe(false)
    // One down (alive 3) → now it shows.
    expect(shouldShowEnemiesRemaining(4, 4, 3)).toBe(true)
  })

  it('is unchanged for waves larger than the threshold (dropping to it means a kill)', () => {
    expect(shouldShowEnemiesRemaining(6, 6, 6)).toBe(false) // full, 0 killed
    expect(shouldShowEnemiesRemaining(6, 6, 5)).toBe(true) // 1 killed, 5 remain
    expect(shouldShowEnemiesRemaining(10, 10, 6)).toBe(false) // 4 killed but 6 remain
  })

  it('hides once the wave is clear', () => {
    expect(shouldShowEnemiesRemaining(4, 4, 0)).toBe(false)
  })
})

describe('EnemiesRemaining', () => {
  afterEach(cleanup)

  it('shows the tally at the threshold with the plural noun', () => {
    renderRemaining({
      totalWaveEnemies: 10,
      spawnedInWave: 10,
      enemiesAlive: ENEMIES_LEFT_THRESHOLD,
    })
    expect(screen.getByText(/enemies left/)).toBeTruthy()
    expect(screen.getByText(String(ENEMIES_LEFT_THRESHOLD))).toBeTruthy()
  })

  it('uses the singular noun for the last enemy', () => {
    renderRemaining({ totalWaveEnemies: 10, spawnedInWave: 10, enemiesAlive: 1 })
    expect(screen.getByText(/enemy left/)).toBeTruthy()
  })

  it('stays hidden on a small wave until the first enemy dies', () => {
    // 4-enemy wave, all spawned and alive → below the threshold but no kills yet.
    const { container } = renderRemaining({
      totalWaveEnemies: 4,
      spawnedInWave: 4,
      enemiesAlive: 4,
    })
    expect(container.firstChild).toBeNull()
  })

  it('shows on a small wave once one enemy has died', () => {
    renderRemaining({ totalWaveEnemies: 4, spawnedInWave: 4, enemiesAlive: 3 })
    expect(screen.getByText(/enemies left/)).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('stays hidden while more than the threshold remain', () => {
    const { container } = renderRemaining({
      totalWaveEnemies: 20,
      spawnedInWave: 20,
      enemiesAlive: ENEMIES_LEFT_THRESHOLD + 1,
    })
    expect(container.firstChild).toBeNull()
  })

  it('stays hidden once the wave is clear (zero remain)', () => {
    const { container } = renderRemaining({
      totalWaveEnemies: 10,
      spawnedInWave: 10,
      enemiesAlive: 0,
    })
    expect(container.firstChild).toBeNull()
  })

  it('stays hidden on boss waves (the boss carries its own HP bar)', () => {
    const { container } = renderRemaining({
      totalWaveEnemies: 1,
      spawnedInWave: 1,
      enemiesAlive: 1,
      boss: { hp: 500, maxHp: 500, label: 'DREADNOUGHT' },
    })
    expect(container.firstChild).toBeNull()
  })

  it('stays hidden outside active play', () => {
    const { container } = renderRemaining({
      phase: GamePhase.upgradeScreen,
      totalWaveEnemies: 10,
      spawnedInWave: 10,
      enemiesAlive: 3,
    })
    expect(container.firstChild).toBeNull()
  })
})
