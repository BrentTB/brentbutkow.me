import { useState } from 'react'
import { SLINGSHOT_UPGRADE_IDS, UPGRADE_DEFINITIONS } from '../../engine/upgrades'
import { UpgradeCategory } from '../../engine/types'
import type { UpgradeId } from '../../engine/upgrade-ids'
import { useGameUIState } from '../../useGameUIState'
import { UpgradeCard } from './UpgradeCard'
import detailStyles from './WeaponDetail.module.scss'
import listStyles from './WeaponsList.module.scss'

type ShipTabProps = {
  onPurchase: (upgradeId: UpgradeId) => void
}

const SLING_SET = new Set<UpgradeId>(SLINGSHOT_UPGRADE_IDS)

// Ship tab: core ship upgrades at the top level, with the four Slingshot
// upgrades tucked behind a drill-down (mirrors the weapon list → detail pattern).
export function ShipTab({ onPurchase }: ShipTabProps) {
  const uiState = useGameUIState()
  const [showSlingshot, setShowSlingshot] = useState(false)

  const shipUpgrades = Object.values(UPGRADE_DEFINITIONS).filter(
    (def) => def.category === UpgradeCategory.ship
  )
  const slingUpgrades = shipUpgrades.filter((def) => SLING_SET.has(def.id))
  const coreUpgrades = shipUpgrades.filter((def) => !SLING_SET.has(def.id))

  const renderCard = (id: UpgradeId) => (
    <UpgradeCard
      key={id}
      def={UPGRADE_DEFINITIONS[id]}
      currentTier={uiState.upgrades[id]?.currentTier ?? 0}
      currency={uiState.currency}
      upgrades={uiState.upgrades}
      onPurchase={onPurchase}
    />
  )

  if (showSlingshot) {
    return (
      <>
        <button
          className={detailStyles.backBtn}
          onClick={() => setShowSlingshot(false)}
          aria-label="Back to ship upgrades"
        >
          ← Slingshot
        </button>
        {slingUpgrades.map((def) => renderCard(def.id))}
      </>
    )
  }

  return (
    <>
      {coreUpgrades.map((def) => renderCard(def.id))}
      <button
        type="button"
        className={`${listStyles.weaponCard} ${listStyles.weaponCardBtn}`}
        onClick={() => setShowSlingshot(true)}
      >
        <span className={listStyles.weaponName}>Slingshot</span>
        <span className={listStyles.weaponArrow}>→</span>
      </button>
    </>
  )
}
