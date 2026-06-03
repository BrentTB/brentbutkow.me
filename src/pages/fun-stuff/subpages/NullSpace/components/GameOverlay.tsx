import { useEffect, useRef, useState } from 'react'
import {
  ABILITY_META,
  CURRENCY_NAME,
  GAME_NAME,
  SHIP_ORDER,
  SHIP_VARIANTS,
  WAVES_PER_LEVEL,
  WEAPON_ORDER,
} from '../data'
import { AbilityKind, GamePhase, ShipKind, UpgradeCategory, UpgradeId } from '../engine/types'
import type { UpgradeDefinition } from '../engine/types'
import { SHIP_SPRITE_KEY } from '../renderer/renderer'
import { SPRITE_MAP } from '../renderer/sprites'
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_CATEGORY_LABELS,
  WEAPON_UNLOCK_UPGRADE,
  canPurchaseUpgrade,
} from '../engine/upgrades'
import type { GameUIState } from '../useNullSpace'
import styles from './GameOverlay.module.scss'

type GameOverlayProps = {
  uiState: GameUIState
  onStart: () => void
  onSelectShip: (kind: ShipKind) => void
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
  onSelectShip,
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
        {uiState.phase === GamePhase.shipSelection && (
          <ShipSelectionScreen onSelect={onSelectShip} />
        )}
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

const STAT_MAX = { hp: 160, shield: 140, damage: 10, speed: 200, fireRate: 4, shieldRegen: 8 }

const PREVIEW_PIXEL = 5

function ShipSpritePreview({ kind }: { kind: ShipKind }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const data = SPRITE_MAP[SHIP_SPRITE_KEY[kind]]
    const h = data.length
    const w = data[0].length
    canvas.width = w * PREVIEW_PIXEL
    canvas.height = h * PREVIEW_PIXEL
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = data[y][x]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(x * PREVIEW_PIXEL, y * PREVIEW_PIXEL, PREVIEW_PIXEL, PREVIEW_PIXEL)
        }
      }
    }
  }, [kind])
  return <canvas ref={ref} className={styles.shipPreviewCanvas} />
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statTrack}>
        <div
          className={styles.statFill}
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ShipSelectionScreen({ onSelect }: { onSelect: (kind: ShipKind) => void }) {
  const [selected, setSelected] = useState<ShipKind>(ShipKind.fighter)
  const variant = SHIP_VARIANTS[selected]

  return (
    <div className={styles.shipSelectLayout}>
      <h2 className={styles.title}>Choose Your Ship</h2>
      <div className={styles.shipCards}>
        {SHIP_ORDER.map((kind) => {
          const v = SHIP_VARIANTS[kind]
          return (
            <button
              key={kind}
              className={`${styles.shipCard} ${selected === kind ? styles.shipCardSelected : ''}`}
              onClick={() => setSelected(kind)}
            >
              <span className={styles.shipCardName}>{v.label}</span>
            </button>
          )
        })}
      </div>
      <div className={styles.shipDetail}>
        <p className={styles.shipDesc}>{variant.description}</p>
        <StatBar label="HP" value={variant.stats.maxHp} max={STAT_MAX.hp} color="#44bb44" />
        <StatBar
          label="Shield"
          value={variant.stats.maxShield}
          max={STAT_MAX.shield}
          color="#6ae8f5"
        />
        <StatBar
          label="Shield Regen"
          value={variant.stats.shieldRegen}
          max={STAT_MAX.shieldRegen}
          color="#44bb44"
        />
        <StatBar
          label="Damage"
          value={variant.stats.damage}
          max={STAT_MAX.damage}
          color="#e9b872"
        />
        <StatBar label="Speed" value={variant.stats.speed} max={STAT_MAX.speed} color="#cc88ff" />
        <StatBar
          label="Fire Rate"
          value={variant.stats.fireRate}
          max={STAT_MAX.fireRate}
          color="#f5a53d"
        />
      </div>
      <ShipSpritePreview kind={selected} />
      <button className={styles.primaryBtn} onClick={() => onSelect(selected)}>
        Launch
      </button>
    </div>
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

// Unlock upgrades are surfaced in the weapons list, not the per-weapon detail.
const UNLOCK_UPGRADE_IDS = new Set(Object.values(WEAPON_UNLOCK_UPGRADE))

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
  return (
    <>
      {WEAPON_ORDER.map((weapon) => {
        const ability = uiState.abilities.find((a) => a.kind === weapon)
        const isUnlocked = ability?.unlocked ?? false
        const unlockId = WEAPON_UNLOCK_UPGRADE[weapon]
        const needsUnlock = !!unlockId && !isUnlocked
        const unlockDef = unlockId ? UPGRADE_DEFINITIONS[unlockId] : null
        const unlockCost = needsUnlock && unlockDef ? unlockDef.tiers[0].cost : 0
        const canUnlock =
          needsUnlock && unlockId
            ? canPurchaseUpgrade(uiState.upgrades, unlockId, uiState.currency)
            : false

        if (needsUnlock && unlockId) {
          return (
            <div key={weapon} className={styles.weaponCard}>
              <span className={`${styles.weaponBtn} ${styles.weaponBtnDisabled}`}>
                <span className={styles.weaponName}>{ABILITY_META[weapon].label}</span>
              </span>
              <button
                type="button"
                className={styles.buyBtn}
                disabled={!canUnlock}
                onClick={() => onPurchase(unlockId)}
              >
                Unlock {unlockCost} ✦
              </button>
            </div>
          )
        }
        return (
          <button
            key={weapon}
            type="button"
            className={`${styles.weaponCard} ${styles.weaponCardBtn}`}
            onClick={() => onSelect(weapon)}
          >
            <span className={styles.weaponName}>{ABILITY_META[weapon].label}</span>
            <span className={styles.weaponArrow}>→</span>
          </button>
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
      d.category === UpgradeCategory.weapons && d.weapon === weapon && !UNLOCK_UPGRADE_IDS.has(d.id)
  )

  return (
    <>
      <button className={styles.backBtn} onClick={onBack} aria-label="Back to weapons">
        ← {ABILITY_META[weapon].label}
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

  const body = (
    <>
      <span className={styles.upgradeInfo}>
        <span className={styles.upgradeName}>{def.label}</span>
        <span className={styles.upgradeDesc}>{def.description}</span>
      </span>
      <span className={styles.upgradeTierRow}>
        {def.tiers.map((_, i) => (
          <span
            key={i}
            className={`${styles.tierPip} ${i < currentTier ? styles.tierFilled : ''}`}
          />
        ))}
      </span>
      {!maxed ? (
        <span className={styles.buyBtn}>{nextCost} ✦</span>
      ) : (
        <span className={styles.maxedLabel}>MAX</span>
      )}
    </>
  )

  if (maxed) {
    return <div className={`${styles.upgradeCard} ${styles.upgradeMaxed}`}>{body}</div>
  }

  return (
    <button
      type="button"
      className={`${styles.upgradeCard} ${styles.upgradeCardBtn}`}
      disabled={!canBuy}
      onClick={() => onPurchase(def.id)}
    >
      {body}
    </button>
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
