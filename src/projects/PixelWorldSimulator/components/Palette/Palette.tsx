import { useState } from 'react'
import { SegmentedToggle } from '../../../../components/inputs/SegmentedToggle'
import { MaterialId } from '../../pixel-world.types'
import { MATERIAL_GROUPS, MaterialGroup } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { materialCss } from '../../engine/palette'
import styles from './Palette.module.scss'

type PaletteProps = {
  selected: MaterialId
  onSelect(material: MaterialId): void
}

const GROUP_OPTIONS = MATERIAL_GROUPS.map(({ group, label }) => ({ value: group, label }))

export function Palette({ selected, onSelect }: PaletteProps) {
  const [openGroup, setOpenGroup] = useState<MaterialGroup>(MATERIAL_GROUPS[0].group)
  const shown = MATERIAL_GROUPS.find(({ group }) => group === openGroup) ?? MATERIAL_GROUPS[0]

  return (
    <div className={styles.palette}>
      <div className={styles.groups}>
        <SegmentedToggle
          options={GROUP_OPTIONS}
          value={openGroup}
          onChange={setOpenGroup}
          ariaLabel="Material group"
        />
        {/* Erase stays out here: it is a tool, and it should never be a tab away. */}
        <Swatch material={MaterialId.empty} selected={selected} onSelect={onSelect} />
      </div>

      <div className={styles.swatches}>
        {shown.materials.map((material) => (
          <Swatch key={material} material={material} selected={selected} onSelect={onSelect} />
        ))}
      </div>
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
}
