import { useState } from 'react'
import { CURRENCY_NAME, GAME_NAME, WAVES_PER_LEVEL } from '../data'
import { AbilityKind, GamePhase, UpgradeCategory, UpgradeId } from '../engine/types'
import type { UpgradeDefinition } from '../engine/types'
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_CATEGORY_LABELS,
  canPurchaseUpgrade,
} from '../engine/upgrades'
import type { GameUIState } from '../useNullSpace'
import styles from './GameOverlay.module.scss'

type GameOverlayProps = {
  uiState: GameUIState
  onStart: () => void
  onNextWave: () => void
  onRestart: () => void
  onPurchaseUpgrade: (upgradeId: UpgradeId) => void
  onFinishUpgrades: () => void
  onResume: () => void
  onSetSpeed: (speed: number) => void
  gameSpeed: number
}

export function GameOverlay({
  uiState,
  onStart,
  onNextWave,
  onRestart,
  onPurchaseUpgrade,
  onFinishUpgrades,
  onResume,
  onSetSpeed,
  gameSpeed,
}: GameOverlayProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (uiState.phase === GamePhase.playing) return null

  // Settings sits on top of the pause screen — close it on resume/restart
  const handleResume = () => {
    setSettingsOpen(false)
    onResume()
  }
  const handleRestart = () => {
    setSettingsOpen(false)
    onRestart()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {uiState.phase === GamePhase.menu && <MenuScreen onStart={onStart} />}
        {uiState.phase === GamePhase.paused && !settingsOpen && (
          <PauseScreen
            onResume={handleResume}
            onSettings={() => setSettingsOpen(true)}
            onRestart={handleRestart}
          />
        )}
        {uiState.phase === GamePhase.paused && settingsOpen && (
          <SettingsScreen
            gameSpeed={gameSpeed}
            onSetSpeed={onSetSpeed}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {uiState.phase === GamePhase.waveComplete && (
          <WaveCompleteScreen
            wave={uiState.wave}
            level={uiState.level}
            score={uiState.score}
            onNextWave={onNextWave}
          />
        )}
        {uiState.phase === GamePhase.upgradeScreen && (
          <UpgradeScreen
            uiState={uiState}
            onPurchase={onPurchaseUpgrade}
            onContinue={onFinishUpgrades}
          />
        )}
        {uiState.phase === GamePhase.gameOver && (
          <GameOverScreen
            score={uiState.score}
            highScore={uiState.highScore}
            isNewHighScore={uiState.isNewHighScore}
            level={uiState.level}
            wave={uiState.wave}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  )
}

function PauseScreen({
  onResume,
  onSettings,
  onRestart,
}: {
  onResume: () => void
  onSettings: () => void
  onRestart: () => void
}) {
  return (
    <>
      <h2 className={styles.title}>Paused</h2>
      <button className={styles.primaryBtn} onClick={onResume}>
        Resume
      </button>
      <button className={styles.secondaryBtn} onClick={onSettings}>
        Settings
      </button>
      <button className={styles.secondaryBtn} onClick={onRestart}>
        Restart
      </button>
      <p className={styles.hint}>Press P to resume</p>
    </>
  )
}

const SPEED_OPTIONS = [0.5, 1, 2] as const

function SettingsScreen({
  gameSpeed,
  onSetSpeed,
  onClose,
}: {
  gameSpeed: number
  onSetSpeed: (speed: number) => void
  onClose: () => void
}) {
  return (
    <>
      <h2 className={styles.title}>Settings</h2>
      <div className={styles.settingRow}>
        <span className={styles.settingLabel}>Game speed</span>
        <div className={styles.segmented} role="group" aria-label="Game speed">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={`${styles.segment} ${gameSpeed === speed ? styles.segmentActive : ''}`}
              aria-pressed={gameSpeed === speed}
              onClick={() => onSetSpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </div>
      </div>
      <button className={styles.primaryBtn} onClick={onClose}>
        Back
      </button>
    </>
  )
}

function MenuScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <h2 className={styles.title}>{GAME_NAME}</h2>
      <p className={styles.subtitle}>Control space itself to protect your ship</p>
      <p className={styles.hint}>Click anywhere during gameplay to launch strikes</p>
      <button className={styles.primaryBtn} onClick={onStart}>
        Start Game
      </button>
    </>
  )
}

function WaveCompleteScreen({
  wave,
  level,
  score,
  onNextWave,
}: {
  wave: number
  level: number
  score: number
  onNextWave: () => void
}) {
  const waveInLevel = ((wave - 1) % WAVES_PER_LEVEL) + 1
  return (
    <>
      <h2 className={styles.title}>
        Wave {waveInLevel}/{WAVES_PER_LEVEL} Complete
      </h2>
      <p className={styles.stat}>Level {level}</p>
      <p className={styles.stat}>Score: {score}</p>
      <button className={styles.primaryBtn} onClick={onNextWave}>
        Next Wave
      </button>
    </>
  )
}

const CATEGORY_ORDER: UpgradeCategory[] = [
  UpgradeCategory.weapons,
  UpgradeCategory.ship,
  UpgradeCategory.powers,
]

const WEAPON_LABELS: Record<AbilityKind, string> = {
  [AbilityKind.meteorite]: 'Meteorite',
  [AbilityKind.blackHole]: 'Black Hole',
  [AbilityKind.meteor]: 'Meteor',
}

function UpgradeScreen({
  uiState,
  onPurchase,
  onContinue,
}: {
  uiState: GameUIState
  onPurchase: (upgradeId: UpgradeId) => void
  onContinue: () => void
}) {
  const [activeTab, setActiveTab] = useState<UpgradeCategory>(UpgradeCategory.weapons)
  const [selectedWeapon, setSelectedWeapon] = useState<AbilityKind | null>(null)

  const upgradesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: UPGRADE_CATEGORY_LABELS[cat],
  }))

  return (
    <div className={styles.upgradeLayout}>
      <h2 className={styles.title}>Level {uiState.level} Complete</h2>
      <p className={styles.currencyDisplay}>
        {CURRENCY_NAME}: <span className={styles.currencyValue}>{uiState.currency}</span>
      </p>

      <div className={styles.tabBar}>
        {upgradesByCategory.map((group) => (
          <button
            key={group.category}
            className={`${styles.tab} ${activeTab === group.category ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab(group.category)
              setSelectedWeapon(null)
            }}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className={styles.upgradeGrid}>
        {activeTab === UpgradeCategory.weapons && !selectedWeapon && (
          <WeaponsList uiState={uiState} onSelect={setSelectedWeapon} onPurchase={onPurchase} />
        )}
        {activeTab === UpgradeCategory.weapons && selectedWeapon && (
          <WeaponDetail
            weapon={selectedWeapon}
            uiState={uiState}
            onBack={() => setSelectedWeapon(null)}
            onPurchase={onPurchase}
          />
        )}
        {activeTab !== UpgradeCategory.weapons &&
          Object.values(UPGRADE_DEFINITIONS)
            .filter((d) => d.category === activeTab)
            .map((def) => (
              <UpgradeCard
                key={def.id}
                def={def}
                currentTier={uiState.upgrades[def.id]?.currentTier ?? 0}
                currency={uiState.currency}
                upgrades={uiState.upgrades}
                onPurchase={onPurchase}
              />
            ))}
      </div>

      <button className={styles.primaryBtn} onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}

function WeaponsList({
  uiState,
  onSelect,
  onPurchase,
}: {
  uiState: GameUIState
  onSelect: (weapon: AbilityKind) => void
  onPurchase: (upgradeId: UpgradeId) => void
}) {
  const weapons = [AbilityKind.meteorite, AbilityKind.blackHole, AbilityKind.meteor]

  const unlockIds: Partial<Record<AbilityKind, UpgradeId>> = {
    [AbilityKind.blackHole]: UpgradeId.unlockBlackHole,
    [AbilityKind.meteor]: UpgradeId.unlockMeteor,
  }

  return (
    <>
      {weapons.map((weapon) => {
        const ability = uiState.abilities.find((a) => a.kind === weapon)
        const isUnlocked = ability?.unlocked ?? false
        const unlockId = unlockIds[weapon]
        const needsUnlock = !!unlockId && !isUnlocked
        const unlockDef = unlockId ? UPGRADE_DEFINITIONS[unlockId] : null
        const unlockCost = needsUnlock && unlockDef ? unlockDef.tiers[0].cost : 0
        const canUnlock =
          needsUnlock && unlockId
            ? canPurchaseUpgrade(uiState.upgrades, unlockId, uiState.currency)
            : false

        return (
          <div key={weapon} className={styles.weaponCard}>
            <button
              className={styles.weaponBtn}
              onClick={() => !needsUnlock && onSelect(weapon)}
              disabled={needsUnlock}
            >
              <span className={styles.weaponName}>{WEAPON_LABELS[weapon]}</span>
              {!needsUnlock && <span className={styles.weaponArrow}>→</span>}
            </button>
            {needsUnlock && unlockId && (
              <button
                className={styles.buyBtn}
                disabled={!canUnlock}
                onClick={() => onPurchase(unlockId)}
              >
                Unlock {unlockCost} ✦
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}

function WeaponDetail({
  weapon,
  uiState,
  onBack,
  onPurchase,
}: {
  weapon: AbilityKind
  uiState: GameUIState
  onBack: () => void
  onPurchase: (upgradeId: UpgradeId) => void
}) {
  const subUpgrades = Object.values(UPGRADE_DEFINITIONS).filter(
    (d) =>
      d.category === UpgradeCategory.weapons &&
      d.weapon === weapon &&
      d.id !== UpgradeId.unlockMeteor &&
      d.id !== UpgradeId.unlockBlackHole
  )

  return (
    <>
      <button className={styles.backBtn} onClick={onBack} aria-label="Back to weapons">
        ← {WEAPON_LABELS[weapon]}
      </button>
      {subUpgrades.map((def) => (
        <UpgradeCard
          key={def.id}
          def={def}
          currentTier={uiState.upgrades[def.id]?.currentTier ?? 0}
          currency={uiState.currency}
          upgrades={uiState.upgrades}
          onPurchase={onPurchase}
        />
      ))}
    </>
  )
}

function UpgradeCard({
  def,
  currentTier,
  currency,
  upgrades,
  onPurchase,
}: {
  def: UpgradeDefinition
  currentTier: number
  currency: number
  upgrades: GameUIState['upgrades']
  onPurchase: (upgradeId: UpgradeId) => void
}) {
  const maxed = currentTier >= def.tiers.length
  const nextCost = maxed ? 0 : def.tiers[currentTier].cost
  const canBuy = canPurchaseUpgrade(upgrades, def.id, currency)

  return (
    <div className={`${styles.upgradeCard} ${maxed ? styles.upgradeMaxed : ''}`}>
      <div className={styles.upgradeInfo}>
        <div className={styles.upgradeName}>{def.label}</div>
        <div className={styles.upgradeDesc}>{def.description}</div>
      </div>
      <div className={styles.upgradeTierRow}>
        {def.tiers.map((_, i) => (
          <div
            key={i}
            className={`${styles.tierPip} ${i < currentTier ? styles.tierFilled : ''}`}
          />
        ))}
      </div>
      {!maxed ? (
        <button className={styles.buyBtn} disabled={!canBuy} onClick={() => onPurchase(def.id)}>
          {nextCost} ✦
        </button>
      ) : (
        <span className={styles.maxedLabel}>MAX</span>
      )}
    </div>
  )
}

function GameOverScreen({
  score,
  highScore,
  isNewHighScore,
  level,
  wave,
  onRestart,
}: {
  score: number
  highScore: number
  isNewHighScore: boolean
  level: number
  wave: number
  onRestart: () => void
}) {
  const waveInLevel = wave > 0 ? ((wave - 1) % WAVES_PER_LEVEL) + 1 : 0
  return (
    <>
      <h2 className={styles.title}>Game Over</h2>
      <p className={styles.stat}>
        Reached Level {level}, Wave {waveInLevel}/{WAVES_PER_LEVEL}
      </p>
      <p className={styles.stat}>Score: {score}</p>
      {isNewHighScore && <p className={styles.highScoreNew}>New High Score!</p>}
      <p className={styles.highScore}>Best: {highScore}</p>
      <button className={styles.primaryBtn} onClick={onRestart}>
        Play Again
      </button>
    </>
  )
}
