import { useMemo, useState } from 'react'
import { SegmentedToggle } from '../../../../components/inputs/SegmentedToggle'
import { MaterialId } from '../../pixel-world.types'
import { MATERIAL_GROUPS, MATERIAL_SLOTS, MaterialGroup, simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { chipColour } from '../../engine/palette'
import { MaterialSlots } from '../MaterialSlots/MaterialSlots'
import styles from './Palette.module.scss'

type PaletteProps = {
  selected: MaterialId
  onSelect(material: MaterialId): void
}

const GROUP_OPTIONS = MATERIAL_GROUPS.map(({ group, label }) => ({ value: group, label }))
const EVERY_MATERIAL = MATERIAL_GROUPS.flatMap(({ materials }) => materials)

/** The group holding a material, or nothing for Erase, which lives outside them all. */
function groupHolding(material: MaterialId): MaterialGroup | undefined {
  return MATERIAL_GROUPS.find(({ materials }) => materials.includes(material))?.group
}

export function Palette({ selected, onSelect }: PaletteProps) {
  // Opens on the group holding the current brush, so the selected swatch is on screen from the start.
  const [openGroup, setOpenGroup] = useState<MaterialGroup>(
    () => groupHolding(selected) ?? MATERIAL_GROUPS[0].group
  )
  const [query, setQuery] = useState('')
  const [slots, setSlots] = useState<(MaterialId | null)[]>(() =>
    Array.from({ length: MATERIAL_SLOTS }, () => null)
  )
  const [waiting, setWaiting] = useState<number | null>(null)

  // Picking a material fills a waiting slot rather than only moving the brush, which is what makes a slot
  // something you set by pointing at what you want in it.
  const pick = (material: MaterialId) => {
    if (waiting !== null) {
      setSlots((current) => current.map((held, index) => (index === waiting ? material : held)))
      setWaiting(null)
    }
    onSelect(material)
  }

  const searching = query.trim().length > 0
  const shown = useMemo(() => {
    // A search looks across every group, since the point of it is not knowing which one holds the thing.
    if (searching) {
      const needle = query.trim().toLowerCase()
      return EVERY_MATERIAL.filter((material) =>
        MATERIALS[material].label.toLowerCase().includes(needle)
      )
    }
    const group = MATERIAL_GROUPS.find(({ group }) => group === openGroup) ?? MATERIAL_GROUPS[0]
    return group.materials
  }, [searching, query, openGroup])

  return (
    <div className={styles.palette}>
      <div className={styles.groups}>
        <SegmentedToggle
          options={GROUP_OPTIONS}
          value={openGroup}
          onChange={(group) => {
            setQuery('')
            setOpenGroup(group)
          }}
          ariaLabel="Material group"
        />

        <input
          type="search"
          className={styles.search}
          value={query}
          placeholder={simCopy.searchPlaceholder}
          aria-label="Search materials"
          onChange={(event) => setQuery(event.target.value)}
        />

        {/* Erase stays out here: it is a tool, and it should never be a tab away. */}
        <Swatch material={MaterialId.empty} selected={selected} onSelect={pick} />
      </div>

      <div className={styles.swatches}>
        {shown.map((material) => (
          <Swatch key={material} material={material} selected={selected} onSelect={pick} />
        ))}
        {searching && shown.length === 0 && <p className={styles.noMatch}>{simCopy.noMatch}</p>}
      </div>

      {/* Kept under the swatches rather than in the tab row: these are the two you reach for without
          looking, and they should sit still while the tabs above them change what is on show. */}
      <MaterialSlots
        slots={slots}
        waiting={waiting}
        selected={selected}
        onUse={(index) => {
          const held = slots[index]
          if (held !== null) onSelect(held)
        }}
        onAssign={(index) => setWaiting((current) => (current === index ? null : index))}
      />
    </div>
  )
}

type SwatchProps = {
  material: MaterialId
  selected: MaterialId
  onSelect(material: MaterialId): void
}

function Swatch({ material, selected, onSelect }: SwatchProps) {
  const isErase = material === MaterialId.empty

  return (
    <button
      type="button"
      className={`${styles.swatch} ${isErase ? styles.erase : ''}`}
      title={MATERIALS[material].blurb}
      aria-pressed={material === selected}
      onClick={() => onSelect(material)}
    >
      <span
        className={styles.chip}
        style={{ background: chipColour(material) }}
        aria-hidden="true"
      />
      {MATERIALS[material].label}
    </button>
  )
}
