import { useState } from 'react'
import { useMediaQuery } from '../../../../components/utils/useMediaQuery'
import { MaterialId } from '../../pixel-world.types'
import { MATERIAL_SLOTS, PALETTE_SHEET_QUERY, simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { chipColour } from '../../engine/palette'
import { MaterialSlots } from '../MaterialSlots/MaterialSlots'
import { MaterialPicker } from './MaterialPicker'
import { MaterialSheet } from './MaterialSheet'
import styles from './Palette.module.scss'

type PaletteProps = {
  selected: MaterialId
  onSelect(material: MaterialId): void
}

export function Palette({ selected, onSelect }: PaletteProps) {
  const [slots, setSlots] = useState<(MaterialId | null)[]>(() =>
    Array.from({ length: MATERIAL_SLOTS }, () => null)
  )
  const [waiting, setWaiting] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // A sheet where there is no room for the grid, the grid where there is. Rendering both and hiding one with
  // CSS would keep a second copy of every swatch in a page that is short of room to begin with.
  const asSheet = useMediaQuery(PALETTE_SHEET_QUERY)

  // Picking a material fills a waiting slot rather than only moving the brush, which is what makes a slot
  // something you set by pointing at what you want in it.
  const pick = (material: MaterialId) => {
    if (waiting !== null) {
      setSlots((current) => current.map((held, index) => (index === waiting ? material : held)))
      setWaiting(null)
    }
    onSelect(material)
  }

  return (
    <div className={styles.palette}>
      {asSheet ? (
        <button
          type="button"
          className={styles.current}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label={`${simCopy.picker.open}. ${MATERIALS[selected].label}`}
          onClick={() => setSheetOpen(true)}
        >
          <span
            className={styles.chip}
            style={{ background: chipColour(selected) }}
            aria-hidden="true"
          />
          <span className={styles.currentLabel}>{MATERIALS[selected].label}</span>
          <span className={styles.caret} aria-hidden="true">
            ▾
          </span>
        </button>
      ) : (
        <MaterialPicker selected={selected} onSelect={pick} />
      )}

      {/* Kept under the swatches rather than in the tab row: these are the ones you reach for without
          looking, and they should sit still while the tabs above them change what is on show. */}
      <MaterialSlots
        slots={slots}
        waiting={waiting}
        selected={selected}
        onUse={(index) => {
          const held = slots[index]
          if (held !== null) onSelect(held)
        }}
        onAssign={(index) => {
          setWaiting((current) => (current === index ? null : index))
          // On a phone there is no grid on screen to choose from, so filling a slot opens the picker.
          if (asSheet) setSheetOpen(true)
        }}
      />

      {sheetOpen && (
        <MaterialSheet selected={selected} onSelect={pick} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  )
}
