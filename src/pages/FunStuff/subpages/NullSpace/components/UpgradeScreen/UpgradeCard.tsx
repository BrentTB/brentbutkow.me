import type { UpgradeDefinition, UpgradeId } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import { BASE_KIND_OF } from '../../engine/abilities'
import { canPurchaseUpgrade } from '../../engine/upgrades'
import sharedStyles from '../OverlayShared.module.scss'
import styles from './UpgradeCard.module.scss'

type UpgradeCardProps = {
  def: UpgradeDefinition
  currentTier: number
  currency: number
  upgrades: GameUIState['upgrades']
  onPurchase: (upgradeId: UpgradeId) => void
}

export function UpgradeCard({
  def,
  currentTier,
  currency,
  upgrades,
  onPurchase,
}: UpgradeCardProps) {
  const maxed = currentTier >= def.tiers.length
  const nextCost = maxed ? 0 : def.tiers[currentTier].cost
  const canBuy = canPurchaseUpgrade(upgrades, def.id, currency)
  // Upgrades belonging to an ultimate (their weapon is an ultimate kind) read as
  // special, matching the ultimate's hotbar styling. BASE_KIND_OF is keyed by
  // ultimate kinds only, so a ship-weapon `def.weapon` simply isn't a member.
  const isUltimateUpgrade = def.weapon !== undefined && def.weapon in BASE_KIND_OF
  const ultimateClass = isUltimateUpgrade ? styles.upgradeUltimate : ''

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
        <span className={sharedStyles.buyBtn}>{nextCost} ✦</span>
      ) : (
        <span className={styles.maxedLabel}>MAX</span>
      )}
    </>
  )

  if (maxed) {
    return (
      <div className={`${styles.upgradeCard} ${styles.upgradeMaxed} ${ultimateClass}`}>{body}</div>
    )
  }

  return (
    <button
      type="button"
      className={`${styles.upgradeCard} ${styles.upgradeCardBtn} ${ultimateClass}`}
      disabled={!canBuy}
      onClick={() => onPurchase(def.id)}
    >
      {body}
    </button>
  )
}
