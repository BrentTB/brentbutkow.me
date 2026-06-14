import { useState } from 'react'
import { ShipKind } from '../../engine/types'
import { ShipSpritePreview } from './ShipSpritePreview'
import { StatBar } from './StatBar'
import styles from './ShipSelectionScreen.module.scss'
import sharedStyles from '../OverlayShared.module.scss'
import { SHIP_VARIANTS, SHIP_ORDER, STAT_MAX } from '../../engine/ship/ship-data'

type ShipSelectionScreenProps = {
  onSelect: (kind: ShipKind) => void
}

const DEFAULT_SHIP = ShipKind.fighter

export function ShipSelectionScreen({ onSelect }: ShipSelectionScreenProps) {
  const [selected, setSelected] = useState<ShipKind>(DEFAULT_SHIP)
  const variant = SHIP_VARIANTS[selected]

  return (
    <div className={styles.shipSelectLayout}>
      <h2 className={sharedStyles.title}>Choose Your Ship</h2>
      <div className={styles.shipCards}>
        {SHIP_ORDER.map((kind) => {
          const v = SHIP_VARIANTS[kind]
          return (
            <button
              key={kind}
              className={`${styles.shipCard} ${selected === kind ? styles.shipCardSelected : ''}`}
              onClick={() => setSelected(kind)}
            >
              <span className={styles.shipCardName}>{v.label}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.shipDetail}>
        <p className={styles.shipDesc}>{variant.description}</p>
        <StatBar label="HP" value={variant.stats.maxHp} max={STAT_MAX.maxHp} color="#44bb44" />
        <StatBar
          label="Shield"
          value={variant.stats.maxShield}
          max={STAT_MAX.maxShield}
          color="#6ae8f5"
        />
        <StatBar
          label="Shield Regen"
          value={variant.stats.shieldRegen}
          max={STAT_MAX.shieldRegen}
          color="#44bb44"
        />
        <StatBar
          label="Damage"
          value={variant.stats.damage}
          max={STAT_MAX.damage}
          color="#e9b872"
        />
        <StatBar label="Speed" value={variant.stats.speed} max={STAT_MAX.speed} color="#cc88ff" />
        <StatBar
          label="Fire Rate"
          value={variant.stats.fireRate}
          max={STAT_MAX.fireRate}
          color="#f5a53d"
        />
        <StatBar
          label="Guns"
          value={variant.stats.weaponSlots}
          max={STAT_MAX.weaponSlots}
          color="#e6739f"
        />
      </div>

      <ShipSpritePreview kind={selected} />
      <button className={sharedStyles.primaryBtn} onClick={() => onSelect(selected)}>
        Launch
      </button>
    </div>
  )
}
