import { MaterialId } from '../../pixel-world.types'
import { MATERIALS } from '../../engine/materials'
import { materialCss } from '../../engine/palette'
import styles from './Palette.module.scss'

type PaletteProps = {
  materials: readonly MaterialId[]
  selected: MaterialId
  onSelect(material: MaterialId): void
}

export function Palette({ materials, selected, onSelect }: PaletteProps) {
  return (
    <div className={styles.palette}>
      {materials.map((material) => {
        const isErase = material === MaterialId.empty
        return (
          <button
            key={material}
            type="button"
            className={`${styles.swatch} ${isErase ? styles.erase : ''}`}
            aria-pressed={material === selected}
            onClick={() => onSelect(material)}
          >
            <span
              className={styles.chip}
              style={isErase ? undefined : { background: materialCss(material) }}
              aria-hidden="true"
            />
            {MATERIALS[material].label}
          </button>
        )
      })}
    </div>
  )
}
