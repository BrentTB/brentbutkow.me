import { MaterialId } from '../../pixel-world.types'
import { simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { materialCss } from '../../engine/palette'
import styles from './MaterialSlots.module.scss'

type MaterialSlotsProps = {
  /** What each slot holds, or null for one still empty. */
  slots: readonly (MaterialId | null)[]
  /** The slot waiting to be filled by the next material picked, or null when none is. */
  waiting: number | null
  /** The material the brush is on, so a slot holding it can show as the one in use. */
  selected: MaterialId
  /** Draw with what a slot holds. */
  onUse(index: number): void
  /** Put this slot in line for the next material picked, replacing whatever it holds. */
  onAssign(index: number): void
}

/**
 * The materials you keep coming back to, kept to hand so a handful worked with together does not mean a trip
 * through the group tabs every time. Press an empty slot and then a material to fill it; press a full one to
 * draw with it; press a full one twice to swap what is in it.
 */
export function MaterialSlots({ slots, waiting, selected, onUse, onAssign }: MaterialSlotsProps) {
  return (
    <div className={styles.slots} role="group" aria-label="Favourite materials">
      <span className={styles.title}>{simCopy.slots.title}</span>

      {slots.map((material, index) => {
        const isWaiting = waiting === index
        const label = material === null ? simCopy.slots.empty : MATERIALS[material].label
        const name =
          material === null
            ? `Favourite ${index + 1}, empty`
            : `Favourite ${index + 1}, ${MATERIALS[material].label}`

        return (
          <button
            key={index}
            type="button"
            className={`${styles.slot} ${isWaiting ? styles.waiting : ''}`}
            aria-label={name}
            aria-pressed={material !== null && material === selected}
            title={material === null ? simCopy.slots.setHint : simCopy.slots.useHint}
            onClick={(event) => {
              // An empty slot is asking to be filled. A full one draws, unless the press is a second one or
              // came with Shift — either way a deliberate "change this", and Shift keeps it reachable from
              // the keyboard, where a double click is not.
              if (material === null || event.detail > 1 || event.shiftKey) onAssign(index)
              else onUse(index)
            }}
          >
            {material !== null && (
              <span
                className={styles.chip}
                style={{ background: materialCss(material) }}
                aria-hidden="true"
              />
            )}
            <span className={styles.label}>{isWaiting ? simCopy.slots.waiting : label}</span>
          </button>
        )
      })}
    </div>
  )
}
