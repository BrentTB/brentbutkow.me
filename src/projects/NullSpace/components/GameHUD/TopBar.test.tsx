import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TopBar } from './TopBar'
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
    wave: 0,
    level: 0,
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

function renderTopBar(over: Partial<GameUIState> = {}) {
  return render(
    <GameUIStateProvider value={makeUiState(over)}>
      <TopBar isFullscreen={false} gameSpeed={1} onPause={noop} onToggleFullscreen={noop} />
    </GameUIStateProvider>
  )
}

afterEach(cleanup)

describe('TopBar heat bar', () => {
  it('renders the heat bar width from slingHeat', () => {
    renderTopBar({ slingHeat: 0.8 })
    expect(screen.getByTestId('heatBar').style.width).toBe('80%')
  })

  // Regression: heat updates every frame, so the shared CSS width transition
  // perpetually re-targets and lags on mobile (bar stuck empty until pause).
  // The heat bar must track live (transition: none); other bars keep the smooth one.
  it('updates the heat bar live with no width transition', () => {
    renderTopBar({ slingHeat: 0.5 })
    expect(screen.getByTestId('heatBar').style.transition).toBe('none')
  })

  it('leaves the HP bar transition to CSS (not overridden)', () => {
    renderTopBar()
    expect(screen.getByTestId('hpBar').style.transition).toBe('')
  })
})
