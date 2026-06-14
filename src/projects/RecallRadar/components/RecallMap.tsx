import { formatNumber } from '../chart-format'
import type { LabelCount } from '../recall.types'
import { STATE_GRID_COLS, STATE_GRID_ROWS, stateGrid } from '../us-state-grid'
import styles from './RecallMap.module.scss'

type RecallMapProps = {
  byState: LabelCount[]
  activeState: string
  onSelect: (state: string) => void
}

// Lift small counts so low-recall states stay visible; cap alpha for label legibility.
function intensity(count: number, max: number): number {
  return count > 0 ? 0.1 + 0.5 * Math.sqrt(count / max) : 0
}

export function RecallMap({ byState, activeState, onSelect }: RecallMapProps) {
  const counts = new Map(byState.map((entry) => [entry.label, entry.count]))
  const max = Math.max(...byState.map((entry) => entry.count), 1)

  return (
    <figure className={styles.figure}>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${STATE_GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${STATE_GRID_ROWS}, 1fr)`,
        }}
        role="group"
        aria-label="US food recalls by state"
      >
        {stateGrid.map((tile) => {
          const count = counts.get(tile.code) ?? 0
          const active = tile.code === activeState
          return (
            <button
              key={tile.code}
              type="button"
              className={`${styles.tile} ${active ? styles.active : ''} ${
                count === 0 ? styles.empty : ''
              }`}
              style={{
                gridColumn: tile.col,
                gridRow: tile.row,
                backgroundColor:
                  count > 0 ? `rgba(var(--accent-rgb), ${intensity(count, max)})` : undefined,
              }}
              onClick={() => onSelect(active ? '' : tile.code)}
              aria-pressed={active}
              aria-label={`${tile.name}: ${formatNumber(count)} recalls`}
              title={`${tile.name}: ${formatNumber(count)} recalls`}
            >
              {tile.code}
            </button>
          )
        })}
      </div>
      <figcaption className={styles.legend}>
        <span>Fewer</span>
        <span className={styles.legendBar} aria-hidden="true" />
        <span>More</span>
      </figcaption>
    </figure>
  )
}
