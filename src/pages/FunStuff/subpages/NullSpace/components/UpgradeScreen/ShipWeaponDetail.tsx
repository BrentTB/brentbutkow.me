import { SHIP_WEAPON_META } from '../../engine/ship'
import { UNLOCK_UPGRADE_IDS, UPGRADE_DEFINITIONS } from '../../engine/upgrades'
import { ShipWeaponKind, UpgradeCategory } from '../../engine/types'
import type { UpgradeId } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import { UpgradeCard } from './UpgradeCard'
import styles from './WeaponDetail.module.scss'

type ShipWeaponDetailProps = {
  weapon: ShipWeaponKind
  uiState: GameUIState
  onBack: () => void
  onPurchase: (upgradeId: UpgradeId) => void
}

export function ShipWeaponDetail({ weapon, uiState, onBack, onPurchase }: ShipWeaponDetailProps) {
  const subUpgrades = Object.values(UPGRADE_DEFINITIONS).filter(
    (def) =>
      def.category === UpgradeCategory.loadout &&
      def.weapon === weapon &&
      !UNLOCK_UPGRADE_IDS.has(def.id)
  )

  return (
    <>
      <button className={styles.backBtn} onClick={onBack} aria-label="Back to loadout">
        ← {SHIP_WEAPON_META[weapon].label}
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
