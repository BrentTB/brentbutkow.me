import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { UpgradeScreen } from './UpgradeScreen'
import { GameUIStateProvider } from '../../useGameUIState'
import { AbilityKind, EnemyKind, GamePhase, ShipKind, HelperWeaponKind } from '../../engine/types'
import type { PlayerUpgrades } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'

function makeUiState(over: Partial<GameUIState> = {}): GameUIState {
  return {
    phase: GamePhase.upgradeScreen,
    shipKind: ShipKind.fighter,
    score: 0,
    highScore: 0,
    isNewHighScore: false,
    kills: 0,
    wave: 9,
    level: 3,
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
    tutorialStepNumber: 0,
    tutorialStepCount: 0,
    ...over,
  }
}

const noop = () => {}

function renderShop(over: Partial<GameUIState> = {}) {
  render(
    <GameUIStateProvider value={makeUiState(over)}>
      <UpgradeScreen
        onPurchase={noop}
        onPurchaseUltimate={noop}
        onSalvageAbility={noop}
        onContinue={noop}
      />
    </GameUIStateProvider>
  )
}

afterEach(cleanup)

describe('UpgradeScreen pre-boss warning', () => {
  it('shows the cryptic warning and a brace button when a boss is next', () => {
    renderShop({ bossWarning: 'Something bored clean through the asteroids.' })
    expect(screen.getByRole('alert').textContent).toContain(
      'Something bored clean through the asteroids.'
    )
    expect(screen.getByText('Brace for contact')).toBeTruthy()
    // The warning replaces the "Sector Complete" header.
    expect(screen.queryByText(/Sector \d+ Complete/)).toBeNull()
  })

  it('shows the normal sector-complete header when no boss is next', () => {
    renderShop({ bossWarning: null, level: 2 })
    expect(screen.getByText('Sector 2 Complete')).toBeTruthy()
    expect(screen.getByText('Continue')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
