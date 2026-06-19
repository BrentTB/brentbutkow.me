import { useState } from 'react'
import { ABILITY_META, BASE_KIND_OF } from '../../engine/abilities'
import {
  getAllyWeaponUnlocks,
  getSalvageRefund,
  getWeaponModifierUpgrades,
} from '../../engine/upgrades'
import { AbilityKind } from '../../engine/types'
import type { UpgradeId } from '../../engine/upgrade-ids'
import type { GameUIState } from '../../useNullSpace'
import { UpgradeCard } from './UpgradeCard'
import { UltimateCard } from './UltimateCard'
import styles from './WeaponDetail.module.scss'
import listStyles from './WeaponsList.module.scss'

type WeaponDetailProps = {
  weapon: AbilityKind
  uiState: GameUIState
  onBack: () => void
  onPurchase: (upgradeId: UpgradeId) => void
  onPurchaseUltimate: (baseKind: AbilityKind) => void
  onSalvage: (baseKind: AbilityKind) => void
}

export function WeaponDetail({
  weapon,
  uiState,
  onBack,
  onPurchase,
  onPurchaseUltimate,
  onSalvage,
}: WeaponDetailProps) {
  const [showAllyWeapons, setShowAllyWeapons] = useState(false)
  // Salvage acts on the base line; `weapon` may be the ultimate kind when viewing it.
  const salvageBase = BASE_KIND_OF[weapon] ?? weapon
  const refund = getSalvageRefund(uiState.upgrades, uiState.ultimatesOwned, salvageBase)
  const refundLabel = [
    refund.stardust > 0 ? `+${refund.stardust} ✦` : null,
    refund.spaceMetal > 0 ? `+${refund.spaceMetal} ⬢` : null,
    refund.singularityShard > 0 ? `+${refund.singularityShard} ◆` : null,
  ]
    .filter(Boolean)
    .join('  ')
  const subUpgrades = getWeaponModifierUpgrades(weapon)
  // Non-empty only for the Helper line (base Helper or its Helper Factory ultimate).
  const allyWeapons = getAllyWeaponUnlocks(weapon)
  // On the Helper line the Ally Weapons entry sits after the base Helper upgrades
  // but before the Helper Factory's own, so split them. Off the Helper line
  // everything is "base" and the entry is hidden anyway.
  const baseUpgrades =
    allyWeapons.length > 0
      ? subUpgrades.filter((d) => d.weapon === AbilityKind.helper)
      : subUpgrades
  const ultimateUpgrades =
    allyWeapons.length > 0 ? subUpgrades.filter((d) => d.weapon !== AbilityKind.helper) : []

  const card = (def: (typeof subUpgrades)[number]) => (
    <UpgradeCard
      key={def.id}
      def={def}
      currentTier={uiState.upgrades[def.id]?.currentTier ?? 0}
      currency={uiState.currency}
      upgrades={uiState.upgrades}
      onPurchase={onPurchase}
    />
  )

  // Sub-view: the Helper's "Ally Weapons" drill-down — only the 4 weapon unlocks,
  // with a back link to the ability's main upgrade list.
  if (showAllyWeapons) {
    return (
      <>
        <button
          className={styles.backBtn}
          onClick={() => setShowAllyWeapons(false)}
          aria-label={`Back to ${ABILITY_META[weapon].label}`}
        >
          ← Ally Weapons
        </button>
        {allyWeapons.map(card)}
      </>
    )
  }

  return (
    <>
      <button className={styles.backBtn} onClick={onBack} aria-label="Back to weapons">
        ← {ABILITY_META[weapon].label}
      </button>
      {baseUpgrades.map(card)}
      {/* Helper line: drill into a sub-list of the helper weapons allies can wield.
          Slots in after the base Helper upgrades, before the Helper Factory's. */}
      {allyWeapons.length > 0 && (
        <button
          type="button"
          className={`${listStyles.weaponCard} ${listStyles.weaponCardBtn}`}
          onClick={() => setShowAllyWeapons(true)}
        >
          <span className={listStyles.weaponName}>Ally Weapons</span>
          <span className={listStyles.weaponArrow}>→</span>
        </button>
      )}
      {ultimateUpgrades.map(card)}
      <UltimateCard weapon={weapon} uiState={uiState} onPurchaseUltimate={onPurchaseUltimate} />
      <button
        type="button"
        className={styles.salvageBtn}
        disabled={!refund.reclaimable}
        onClick={() => {
          onSalvage(salvageBase)
          onBack()
        }}
      >
        {refund.reclaimable ? `Salvage · ${refundLabel}` : 'Nothing to salvage'}
      </button>
    </>
  )
}
