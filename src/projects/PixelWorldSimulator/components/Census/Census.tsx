import { useEffect, useId, useState } from 'react'
import { MaterialId } from '../../pixel-world.types'
import { simCopy } from '../../data'
import { MATERIALS } from '../../engine/materials'
import { materialCss } from '../../engine/palette'
import styles from './Census.module.scss'

type CensusProps = {
  /** Cells of each material, indexed by `MaterialId`, or null while the tally is switched off. */
  counts: Uint32Array | null
  /** Starts and stops the count, so a closed panel costs nothing to keep around. */
  onWatch(on: boolean): void
}

/**
 * A running tally of what the world is made of, biggest first. Collapsed by default: it is for the curious,
 * and a column of numbers beside the canvas would otherwise be the loudest thing on the page.
 */
export function Census({ counts, onWatch }: CensusProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  // Counting is a pass over every cell, so it only runs while the panel is actually open.
  useEffect(() => {
    onWatch(open)
    return () => onWatch(false)
  }, [open, onWatch])

  const rows: { material: MaterialId; count: number }[] = []
  if (counts !== null) {
    for (const material of MATERIALS) {
      // Air is most of an empty world and tells you nothing; everything else earns a row once it exists.
      if (material.id === MaterialId.empty) continue
      const count = counts[material.id]
      if (count > 0) rows.push({ material: material.id, count })
    }
    rows.sort((a, b) => b.count - a.count)
  }

  return (
    <section className={styles.census}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.caret} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        {simCopy.census.title}
      </button>

      {open && (
        <div className={styles.panel} id={panelId}>
          {rows.length === 0 ? (
            <p className={styles.empty}>{simCopy.census.empty}</p>
          ) : (
            <>
              <ul className={styles.list}>
                {rows.map(({ material, count }) => (
                  <li key={material} className={styles.row}>
                    <span
                      className={styles.chip}
                      style={{ background: materialCss(material) }}
                      aria-hidden="true"
                    />
                    <span className={styles.label}>{MATERIALS[material].label}</span>
                    <span className={styles.count}>{count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.note}>{simCopy.census.airNote}</p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
