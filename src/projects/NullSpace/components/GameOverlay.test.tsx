import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { GameOverlay } from './GameOverlay'
import { GameUIStateProvider } from '../useGameUIState'
import { HelpScreen } from './PauseMenu/HelpScreen'
import { AbilityKind, EnemyKind, GamePhase, ShipKind, HelperWeaponKind } from '../engine/types'
import type { PlayerUpgrades } from '../engine/types'
import type { GameUIState } from '../useNullSpace'

function makeUiState(phase: GameUIState['phase']): GameUIState {
  return {
    phase,
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
  }
}

const noop = () => {}

function renderOverlay(phase: GameUIState['phase'], hasSave = false) {
  const props = {
    onStart: noop,
    onContinue: noop,
    hasSave,
    onSaveAndExit: noop,
    onSelectShip: noop,
    onRestart: noop,
    onSubmitScore: () => Promise.resolve(true),
    onPurchaseUpgrade: noop,
    onPurchaseUltimate: noop,
    onSalvageAbility: noop,
    onFinishUpgrades: noop,
    onResume: noop,
    onSetSpeed: noop,
    onReplayTutorial: noop,
    gameSpeed: 1,
  }
  const utils = render(
    <GameUIStateProvider value={makeUiState(phase)}>
      <GameOverlay {...props} />
    </GameUIStateProvider>
  )
  return {
    ...utils,
    rerender: (next: GameUIState['phase']) =>
      utils.rerender(
        <GameUIStateProvider value={makeUiState(next)}>
          <GameOverlay {...props} />
        </GameUIStateProvider>
      ),
  }
}

describe('GameOverlay', () => {
  afterEach(cleanup)

  // Regression: the dark overlay used to render during `dying` and `warping`,
  // hiding the ship explosion / portal fly-in that play on the canvas.
  it('renders nothing during the dying and warping sequences', () => {
    expect(renderOverlay(GamePhase.dying).container.firstChild).toBeNull()
    cleanup()
    expect(renderOverlay(GamePhase.warping).container.firstChild).toBeNull()
  })

  it('hides "Save & Exit" until a save exists, then shows it', () => {
    renderOverlay(GamePhase.paused, false)
    expect(screen.queryByRole('button', { name: 'Save & Exit' })).toBeNull()
    cleanup()
    renderOverlay(GamePhase.paused, true)
    expect(screen.queryByRole('button', { name: 'Save & Exit' })).not.toBeNull()
  })

  // Regression: the P-key resume path flips phase straight to playing without
  // going through this component's handlers, so a sub-page left open must reset.
  it('returns to the pause menu after resuming from an open sub-page', () => {
    const { rerender } = renderOverlay(GamePhase.paused)

    fireEvent.click(screen.getByRole('button', { name: 'Help' }))
    expect(screen.queryByText('How to play')).not.toBeNull()

    rerender(GamePhase.playing) // P-key resume
    rerender(GamePhase.paused) // pause again

    expect(screen.queryByText('How to play')).toBeNull()
    expect(screen.queryByText('Paused')).not.toBeNull()
  })
})

describe('HelpScreen', () => {
  afterEach(cleanup)

  // Consistent with SettingsScreen: a bare screen, not a modal — no dialog
  // backdrop, and it closes only via the explicit Back button.
  it('is not a modal and closes only via Back', () => {
    const onClose = vi.fn()
    const { container } = render(<HelpScreen onClose={onClose} onReplayTutorial={noop} />)

    expect(screen.queryByRole('dialog')).toBeNull()

    // Clicking the surrounding container does nothing — no click-outside handler.
    fireEvent.click(container.firstChild as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
