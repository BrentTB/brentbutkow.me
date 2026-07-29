import { useMemo, useState } from 'react'
import { SegmentedToggle } from '../../../../components/inputs/SegmentedToggle'
import { MaterialId } from '../../pixel-world.types'
import { MATERIAL_GROUPS, MaterialGroup, simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { chipColour } from '../../engine/palette'
import styles from './Palette.module.scss'

const GROUP_OPTIONS = MATERIAL_GROUPS.map(({ group, label }) => ({ value: group, label }))
const EVERY_MATERIAL = MATERIAL_GROUPS.flatMap(({ materials }) => materials)

/** The group holding a material, or nothing for Erase, which lives outside them all. */
function groupHolding(material: MaterialId): MaterialGroup | undefined {
  return MATERIAL_GROUPS.find(({ materials }) => materials.includes(material))?.group
}

type MaterialPickerProps = {
  selected: MaterialId
  onSelect(material: MaterialId): void
  /** Extra class for the swatch grid. The sheet uses it to hold one height across groups of different sizes. */
  swatchClassName?: string
}

/**
 * Choosing a material: the groups, a search across all of them, and the swatches themselves. Lives apart
 * from the palette that holds it because a phone shows the same picker in a sheet — one implementation with
 * two containers, rather than a second grid that drifts from this one.
 */
export function MaterialPicker({ selected, onSelect, swatchClassName = '' }: MaterialPickerProps) {
  // Opens on the group holding the current brush, so the selected swatch is on screen from the start.
  const [openGroup, setOpenGroup] = useState<MaterialGroup>(
    () => groupHolding(selected) ?? MATERIAL_GROUPS[0].group
  )
  const [query, setQuery] = useState('')

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
    <>
      <div className={styles.groups}>
        {/* The tabs are wider than a phone. They scroll on their own rather than taking the page sideways
            with them, which is what a strip of tabs should do anyway. */}
        <div className={styles.groupStrip}>
          <SegmentedToggle
            options={GROUP_OPTIONS}
            value={openGroup}
            onChange={(group) => {
              setQuery('')
              setOpenGroup(group)
            }}
            ariaLabel="Material group"
          />
        </div>

        <input
          type="search"
          className={styles.search}
          value={query}
          placeholder={simCopy.searchPlaceholder}
          aria-label="Search materials"
          onChange={(event) => setQuery(event.target.value)}
        />

        {/* Erase stays out here: it is a tool, and it should never be a tab away. */}
        <Swatch material={MaterialId.empty} selected={selected} onSelect={onSelect} />
      </div>

      <div className={`${styles.swatches} ${swatchClassName}`}>
        {shown.map((material) => (
          <Swatch key={material} material={material} selected={selected} onSelect={onSelect} />
        ))}
        {searching && shown.length === 0 && <p className={styles.noMatch}>{simCopy.noMatch}</p>}
      </div>
    </>
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
