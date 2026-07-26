import { useEffect, useId, useState, type CSSProperties } from 'react'
import { MaterialId } from '../../pixel-world.types'
import { CENSUS_TRACK_COLOURS, simCopy } from '../../data'
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
 *
 * Rows can be tracked. The list is sorted by count and the counts move constantly, so a row you care about
 * slides up and down the list as the world runs — tracking pins a colour to it so you can find it at a
 * glance, and holds it on screen at zero rather than letting it vanish the moment the last cell goes.
 */
export function Census({ counts, onWatch }: CensusProps) {
  const [open, setOpen] = useState(false)
  // Insertion order is what assigns the colours, so the first material tracked keeps its colour as others
  // come and go.
  const [tracked, setTracked] = useState<MaterialId[]>([])
  const panelId = useId()

  // Counting is a pass over every cell, so it only runs while the panel is actually open.
  useEffect(() => {
    onWatch(open)
    return () => onWatch(false)
  }, [open, onWatch])

  const toggleTracked = (material: MaterialId) => {
    setTracked((current) =>
      current.includes(material) ? current.filter((id) => id !== material) : [...current, material]
    )
  }

  const rows: { material: MaterialId; count: number }[] = []
  if (counts !== null) {
    for (const material of MATERIALS) {
      // Air is most of an empty world and tells you nothing; everything else earns a row once it exists, and
      // a tracked material keeps its row at zero so a count you are watching cannot slip off the list.
      if (material.id === MaterialId.empty) continue
      const count = counts[material.id]
      if (count > 0 || tracked.includes(material.id)) rows.push({ material: material.id, count })
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
            <ul className={styles.list}>
              {rows.map(({ material, count }) => {
                const marker = tracked.indexOf(material)
                const colour =
                  marker < 0
                    ? undefined
                    : CENSUS_TRACK_COLOURS[marker % CENSUS_TRACK_COLOURS.length]

                return (
                  <li key={material}>
                    <button
                      type="button"
                      className={`${styles.row} ${marker < 0 ? '' : styles.trackedRow}`}
                      // The marker colour rides in as a custom property, so the stylesheet owns how a
                      // tracked row actually looks and this only says which colour it was handed.
                      style={
                        colour === undefined ? undefined : ({ '--track': colour } as CSSProperties)
                      }
                      aria-pressed={marker >= 0}
                      title={simCopy.census.track}
                      onClick={() => toggleTracked(material)}
                    >
                      <span
                        className={styles.chip}
                        style={{ background: materialCss(material) }}
                        aria-hidden="true"
                      />
                      <span className={styles.label}>{MATERIALS[material].label}</span>
                      <span className={styles.count}>{count.toLocaleString()}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
