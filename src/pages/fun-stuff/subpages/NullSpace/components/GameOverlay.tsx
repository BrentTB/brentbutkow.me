import { useState } from 'react'
import { CURRENCY_NAME, GAME_NAME } from '../data'
import { GamePhase, UpgradeCategory, UpgradeId } from '../engine/types'
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
}

export function GameOverlay({
  uiState,
  onStart,
  onNextWave,
  onRestart,
  onPurchaseUpgrade,
  onFinishUpgrades,
}: GameOverlayProps) {
  if (uiState.phase === GamePhase.playing) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        {uiState.phase === GamePhase.menu && <MenuScreen onStart={onStart} />}
        {uiState.phase === GamePhase.waveComplete && (
          <WaveCompleteScreen wave={uiState.wave} score={uiState.score} onNextWave={onNextWave} />
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
            wave={uiState.wave}
            onRestart={onRestart}
          />
        )}
      </div>
    </div>
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
  score,
  onNextWave,
}: {
  wave: number
  score: number
  onNextWave: () => void
}) {
  return (
    <>
      <h2 className={styles.title}>Wave {wave} Complete</h2>
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

  const upgradesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: UPGRADE_CATEGORY_LABELS[cat],
    upgrades: Object.values(UPGRADE_DEFINITIONS).filter((d) => d.category === cat),
  }))

  const activeUpgrades = upgradesByCategory.find((g) => g.category === activeTab)?.upgrades ?? []

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
            onClick={() => setActiveTab(group.category)}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className={styles.upgradeGrid}>
        {activeUpgrades.map((def) => (
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
  wave,
  onRestart,
}: {
  score: number
  highScore: number
  wave: number
  onRestart: () => void
}) {
  const isNewHighScore = score >= highScore && score > 0

  return (
    <>
      <h2 className={styles.title}>Game Over</h2>
      <p className={styles.stat}>
        Survived {wave} wave{wave !== 1 ? 's' : ''}
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
