import { ABILITY_META, WEAPON_UNLOCK_UPGRADE } from '../../engine/abilities'
import { UPGRADE_DEFINITIONS, canPurchaseUpgrade } from '../../engine/upgrades'
import { WEAPON_ORDER } from '../../data'
import type { AbilityKind, UpgradeId } from '../../engine/types'
import type { GameUIState } from '../../useNullSpace'
import sharedStyles from '../OverlayShared.module.scss'
import styles from './WeaponsList.module.scss'

type WeaponsListProps = {
  uiState: GameUIState
  onSelect: (weapon: AbilityKind) => void
  onPurchase: (upgradeId: UpgradeId) => void
}

export function WeaponsList({ uiState, onSelect, onPurchase }: WeaponsListProps) {
  const offers = uiState.levelUpWeaponOffers

  return (
    <>
      {WEAPON_ORDER.map((weapon) => {
        const ability = uiState.abilities.find((a) => a.kind === weapon)
        const isUnlocked = ability?.unlocked ?? false
        const unlockId = WEAPON_UNLOCK_UPGRADE[weapon]
        const isOffered = offers.includes(weapon)

        if (!isUnlocked && !isOffered) return null

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
