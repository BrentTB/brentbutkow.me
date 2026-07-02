import { SINGULARITY_SHARD_NAME } from '../../data'
import { ULTIMATE_DEFINITIONS } from '../../engine/abilities'
import { canPurchaseUltimate, ultimateShardCost } from '../../engine/ultimates'
import type { AbilityKind } from '../../engine/types'
import { useGameUIState } from '../../useGameUIState'
import styles from './UltimateCard.module.scss'

type UltimateCardProps = {
  weapon: AbilityKind
  onPurchaseUltimate: (baseKind: AbilityKind) => void
}

// Purchase card for a weapon's Ultimate, shown at the bottom of its WeaponDetail.
// Renders nothing for weapons without an ultimate.
export function UltimateCard({ weapon, onPurchaseUltimate }: UltimateCardProps) {
  const uiState = useGameUIState()
  const def = ULTIMATE_DEFINITIONS[weapon]
  if (!def) return null

  const owned = uiState.ultimatesOwned.includes(def.kind)
  const shardCost = ultimateShardCost(uiState.ultimatesOwned)
  const canBuy = canPurchaseUltimate(uiState, weapon)

  const body = (
    <>
      <span className={styles.info}>
        <span className={styles.name}>★ {def.label}</span>
        <span className={styles.desc}>{def.description}</span>
      </span>
      {owned ? (
        <span className={styles.ownedLabel}>OWNED</span>
      ) : (
        <span className={styles.cost}>
          <span className={styles.costStardust}>✦ {def.cost.stardust}</span>
          <span className={styles.costMetal}>⬢ {def.cost.spaceMetal}</span>
          <span className={styles.costShard} title={SINGULARITY_SHARD_NAME}>
            ◆ {shardCost}
          </span>
        </span>
      )}
    </>
  )

  if (owned) {
    return <div className={`${styles.ultimateCard} ${styles.ultimateOwned}`}>{body}</div>
  }

  return (
    <button
      type="button"
      className={`${styles.ultimateCard} ${styles.ultimateCardBtn}`}
      disabled={!canBuy}
      onClick={() => onPurchaseUltimate(weapon)}
    >
      {body}
    </button>
  )
}
