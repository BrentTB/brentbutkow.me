import { ABILITY_META, WEAPON_UNLOCK_UPGRADE } from '../../engine/abilities'
import { UPGRADE_DEFINITIONS } from '../../engine/upgrades'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import { UpgradeCard } from './UpgradeCard'
import styles from './WeaponDetail.module.scss'

const UNLOCK_UPGRADE_IDS = new Set(Object.values(WEAPON_UNLOCK_UPGRADE))

type WeaponDetailProps = {
  weapon: AbilityKind
  uiState: GameUIState
  onBack: () => void
  onPurchase: (upgradeId: UpgradeId) => void
}

export function WeaponDetail({ weapon, uiState, onBack, onPurchase }: WeaponDetailProps) {
  const subUpgrades = Object.values(UPGRADE_DEFINITIONS).filter(
    (def) =>
      def.category === UpgradeCategory.weapons &&
      def.weapon === weapon &&
      !UNLOCK_UPGRADE_IDS.has(def.id)
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
