import { useState } from 'react'
import { CURRENCY_NAME, SINGULARITY_SHARD_NAME, SPACE_METAL_NAME } from '../../data'
import { ULTIMATE_KIND_OF } from '../../engine/abilities'
import { AbilityKind, UpgradeCategory } from '../../engine/types'
import type { UpgradeId } from '../../engine/upgrade-ids'
import type { GameUIState } from '../../useNullSpace'
import { UPGRADE_CATEGORY_LABELS, UPGRADE_DEFINITIONS } from '../../engine/upgrades'
import { UpgradeCard } from './UpgradeCard'
import { WeaponDetail } from './WeaponDetail'
import { WeaponsList } from './WeaponsList'
import { ShipTab } from './ShipTab'
import styles from './UpgradeScreen.module.scss'
import sharedStyles from '../OverlayShared.module.scss'

const CATEGORY_ORDER: UpgradeCategory[] = [
  UpgradeCategory.weapons,
  UpgradeCategory.ship,
  UpgradeCategory.powers,
]

type UpgradeScreenProps = {
  uiState: GameUIState
  onPurchase: (upgradeId: UpgradeId) => void
  onPurchaseUltimate: (baseKind: AbilityKind) => void
  onContinue: () => void
}

export function UpgradeScreen({
  uiState,
  onPurchase,
  onPurchaseUltimate,
  onContinue,
}: UpgradeScreenProps) {
  const [activeTab, setActiveTab] = useState<UpgradeCategory>(UpgradeCategory.weapons)
  const [selectedWeapon, setSelectedWeapon] = useState<AbilityKind | null>(null)

  // Buying an ultimate replaces its base; jump the detail view straight to the
  // ultimate so its own upgrades (and the inherited base upgrades) show without
  // having to back out and re-enter.
  const handlePurchaseUltimate = (baseKind: AbilityKind) => {
    onPurchaseUltimate(baseKind)
    const ultimateKind = ULTIMATE_KIND_OF[baseKind]
    if (ultimateKind) setSelectedWeapon(ultimateKind)
  }

  const upgradesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: UPGRADE_CATEGORY_LABELS[cat],
  }))

  return (
    <div className={styles.upgradeLayout}>
      <h2 className={sharedStyles.title}>Sector {uiState.level} Complete</h2>
      <p className={styles.currencyDisplay}>
        {CURRENCY_NAME}: <span className={styles.stardustValue}>✦ {uiState.currency}</span>
        {' · '}
        {SPACE_METAL_NAME}: <span className={styles.metalValue}>⬢ {uiState.spaceMetal}</span>
        {' · '}
        {SINGULARITY_SHARD_NAME}:{' '}
        <span className={styles.shardValue}>◆ {uiState.singularityShard}</span>
      </p>

      <div className={styles.tabBar}>
        {upgradesByCategory.map((group) => (
          <button
            key={group.category}
            className={`${styles.tab} ${activeTab === group.category ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab(group.category)
              setSelectedWeapon(null)
            }}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className={styles.upgradeGrid}>
        {activeTab === UpgradeCategory.weapons && !selectedWeapon && (
          <WeaponsList uiState={uiState} onSelect={setSelectedWeapon} onPurchase={onPurchase} />
        )}
        {activeTab === UpgradeCategory.weapons && selectedWeapon && (
          <WeaponDetail
            weapon={selectedWeapon}
            uiState={uiState}
            onBack={() => setSelectedWeapon(null)}
            onPurchase={onPurchase}
            onPurchaseUltimate={handlePurchaseUltimate}
          />
        )}
        {activeTab === UpgradeCategory.ship && (
          <ShipTab uiState={uiState} onPurchase={onPurchase} />
        )}
        {activeTab === UpgradeCategory.powers &&
          Object.values(UPGRADE_DEFINITIONS)
            .filter((def) => def.category === activeTab)
            .map((def) => (
              <UpgradeCard
                key={def.id}
                def={def}
                currentTier={uiState.upgrades[def.id]?.currentTier ?? 0}
                currency={uiState.currency}
                upgrades={uiState.upgrades}
                onPurchase={onPurchase}
              />
            ))}
      </div>

      <button className={sharedStyles.primaryBtn} onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}
