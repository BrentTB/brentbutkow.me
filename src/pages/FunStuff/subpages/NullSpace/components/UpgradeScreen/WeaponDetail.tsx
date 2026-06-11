import { ABILITY_META } from '../../engine/abilities'
import { getWeaponModifierUpgrades } from '../../engine/upgrades'
import { AbilityKind, UpgradeId } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import { UpgradeCard } from './UpgradeCard'
import { UltimateCard } from './UltimateCard'
import styles from './WeaponDetail.module.scss'

type WeaponDetailProps = {
  weapon: AbilityKind
  uiState: GameUIState
  onBack: () => void
  onPurchase: (upgradeId: UpgradeId) => void
  onPurchaseUltimate: (baseKind: AbilityKind) => void
}

export function WeaponDetail({
  weapon,
  uiState,
  onBack,
  onPurchase,
  onPurchaseUltimate,
}: WeaponDetailProps) {
  const subUpgrades = getWeaponModifierUpgrades(weapon)

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
      <UltimateCard weapon={weapon} uiState={uiState} onPurchaseUltimate={onPurchaseUltimate} />
    </>
  )
}
