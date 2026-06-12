import { SHIP_WEAPON_META, SHIP_WEAPON_ORDER, SHIP_WEAPON_UNLOCK_UPGRADE } from '../../engine/ship'
import {
  UPGRADE_DEFINITIONS,
  canPurchaseUpgrade,
  isShipWeaponFullyMaxed,
} from '../../engine/upgrades'
import { ShipWeaponKind } from '../../engine/types'
import type { UpgradeId } from '../../engine/upgrade-ids'
import type { GameUIState } from '../../useNullSpace'
import sharedStyles from '../OverlayShared.module.scss'
import styles from './WeaponsList.module.scss'
import loadoutStyles from './ShipWeaponsList.module.scss'

type ShipWeaponsListProps = {
  uiState: GameUIState
  onSelect: (weapon: ShipWeaponKind) => void
  onPurchase: (upgradeId: UpgradeId) => void
  onEquip: (slotIndex: number, weapon: ShipWeaponKind) => void
}

export function ShipWeaponsList({ uiState, onSelect, onPurchase, onEquip }: ShipWeaponsListProps) {
  const slots = uiState.equippedWeapons
  const unlocked = uiState.unlockedWeapons

  // Carrier (or anything with >1 weaponSlot) gets per-slot pickers above the
  // weapons list. Single-slot ships skip this block — equip happens via the
  // Equip/Equipped button on each row instead.
  const showSlotPickers = slots.length > 1

  return (
    <>
      {showSlotPickers && (
        <div className={loadoutStyles.slotRow}>
          {slots.map((equipped, idx) => {
            // Cycle list = unlocked weapons NOT already equipped in another
            // slot. The click rotates through that list (in unlocked order).
            // When the list is empty / has only the current weapon, the click
            // is a no-op so a slot never "steals" a weapon from another slot.
            const otherSlots = slots.filter((_, i) => i !== idx)
            const cycleList = unlocked.filter((k) => !otherSlots.includes(k))
            const currentIdx = cycleList.indexOf(equipped)
            const next =
              cycleList.length > 0 ? cycleList[(currentIdx + 1) % cycleList.length] : equipped
            const canCycle = next !== equipped
            return (
              <button
                key={idx}
                type="button"
                className={loadoutStyles.slotChip}
                disabled={!canCycle}
                onClick={() => onEquip(idx, next)}
                aria-label={
                  canCycle
                    ? `Slot ${idx + 1}: ${SHIP_WEAPON_META[equipped].label}. Click to cycle to ${SHIP_WEAPON_META[next].label}.`
                    : `Slot ${idx + 1}: ${SHIP_WEAPON_META[equipped].label}.`
                }
              >
                <span className={loadoutStyles.slotChipLabel}>SLOT {idx + 1}</span>
                <span className={loadoutStyles.slotChipName}>
                  {SHIP_WEAPON_META[equipped].label}
                </span>
                {canCycle && <span className={loadoutStyles.slotChipCycle}>↻</span>}
              </button>
            )
          })}
        </div>
      )}

      {SHIP_WEAPON_ORDER.map((weapon) => {
        const isUnlocked = unlocked.includes(weapon)
        const unlockId = SHIP_WEAPON_UNLOCK_UPGRADE[weapon]

        if (!isUnlocked && unlockId) {
          const unlockDef = UPGRADE_DEFINITIONS[unlockId]
          const unlockCost = unlockDef.tiers[0].cost
          const canUnlock = canPurchaseUpgrade(uiState.upgrades, unlockId, uiState.currency)
          return (
            <div key={weapon} className={styles.weaponCard}>
              <span className={`${styles.weaponBtn} ${styles.weaponBtnDisabled}`}>
                <span className={styles.weaponName}>{SHIP_WEAPON_META[weapon].label}</span>
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

        const maxed = isShipWeaponFullyMaxed(weapon, uiState.upgrades)
        const equippedInSlot0 = slots[0] === weapon
        const equippedAnywhere = slots.includes(weapon)
        return (
          <div key={weapon} className={styles.weaponCard}>
            <button
              type="button"
              className={styles.weaponBtn}
              onClick={() => onSelect(weapon)}
              aria-label={`${SHIP_WEAPON_META[weapon].label} details`}
            >
              <span className={styles.weaponName}>{SHIP_WEAPON_META[weapon].label}</span>
              {maxed && <span className={styles.maxedBadge}>MAX</span>}
              <span className={styles.weaponArrow}>→</span>
            </button>
            {!showSlotPickers && (
              <button
                type="button"
                className={sharedStyles.buyBtn}
                disabled={equippedInSlot0}
                onClick={() => onEquip(0, weapon)}
              >
                {equippedInSlot0 ? 'Equipped' : 'Equip'}
              </button>
            )}
            {showSlotPickers && equippedAnywhere && (
              <span className={loadoutStyles.equippedBadge}>EQUIPPED</span>
            )}
          </div>
        )
      })}
    </>
  )
}
