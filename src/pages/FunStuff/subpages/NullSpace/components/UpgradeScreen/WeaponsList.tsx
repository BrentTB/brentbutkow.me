import { ABILITY_META, WEAPON_UNLOCK_UPGRADE } from '../../engine/abilities'
import { UPGRADE_DEFINITIONS, canPurchaseUpgrade, isWeaponFullyMaxed } from '../../engine/upgrades'
import type { AbilityKind, UpgradeId } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import { orderWeaponsForShop } from './weapons-list-order'
import sharedStyles from '../OverlayShared.module.scss'
import styles from './WeaponsList.module.scss'

type WeaponsListProps = {
  uiState: GameUIState
  onSelect: (weapon: AbilityKind) => void
  onPurchase: (upgradeId: UpgradeId) => void
}

export function WeaponsList({ uiState, onSelect, onPurchase }: WeaponsListProps) {
  const offers = uiState.levelUpWeaponOffers
  const order = orderWeaponsForShop(uiState.abilities, offers, uiState.ultimatesOwned)

  return (
    <>
      {order.map((weapon) => {
        const ability = uiState.abilities.find((a) => a.kind === weapon)
        const isUnlocked = ability?.unlocked ?? false
        const unlockId = WEAPON_UNLOCK_UPGRADE[weapon]
        const isOffered = offers.includes(weapon)

        if (!isUnlocked && isOffered && unlockId) {
          const unlockDef = UPGRADE_DEFINITIONS[unlockId]
          const unlockCost = unlockDef.tiers[0].cost
          const canUnlock = canPurchaseUpgrade(uiState.upgrades, unlockId, uiState.currency)
          return (
            <div key={weapon} className={styles.weaponCard}>
              <span className={`${styles.weaponBtn} ${styles.weaponBtnDisabled}`}>
                <span className={styles.weaponName}>{ABILITY_META[weapon].label}</span>
              </span>
              <button
                type="button"
                className={sharedStyles.buyBtn}
                disabled={!canUnlock}
                onClick={() => onPurchase(unlockId)}
              >
                Unlock {unlockCost} ✦
              </button>
            </div>
          )
        }

        const maxed = isWeaponFullyMaxed(weapon, uiState.upgrades)
        return (
          <button
            key={weapon}
            type="button"
            className={`${styles.weaponCard} ${styles.weaponCardBtn}`}
            onClick={() => onSelect(weapon)}
          >
            <span className={styles.weaponName}>{ABILITY_META[weapon].label}</span>
            {maxed && <span className={styles.maxedBadge}>MAX</span>}
            <span className={styles.weaponArrow}>→</span>
          </button>
        )
      })}
    </>
  )
}
