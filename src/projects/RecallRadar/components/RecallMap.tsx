import { formatNumber, seriesMax } from '../chart-format'
import type { LabelCount } from '../recall.types'
import styles from './RecallMap.module.scss'

// One tile of a map grid — a region code placed on a CSS grid (row/col are 1-indexed). The US
// state grid and the EU country grid both conform; the component is grid-agnostic.
export type MapTile = {
  code: string
  name: string
  row: number
  col: number
}

type RecallMapProps = {
  tiles: MapTile[]
  rows: number
  cols: number
  ariaLabel: string
  counts: LabelCount[]
  activeCode: string
  onSelect: (code: string) => void
}

// Lift small counts so low-recall regions stay visible; cap alpha for label legibility.
function intensity(count: number, max: number): number {
  return count > 0 ? 0.1 + 0.5 * Math.sqrt(count / max) : 0
}

// Each cell renders wider than tall so a many-row grid (the EU's 9) doesn't swallow the viewport
// height; square cells put the 9×9 EU map at the full 600px column width in height.
const TILE_WIDTH_TO_HEIGHT = 1.4

export function RecallMap({
  tiles,
  rows,
  cols,
  ariaLabel,
  counts,
  activeCode,
  onSelect,
}: RecallMapProps) {
  const countByCode = new Map(counts.map((entry) => [entry.label, entry.count]))
  const max = seriesMax(counts.map((entry) => entry.count))

  return (
    <figure className={styles.figure}>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          // Derived per grid (a hardcoded ratio fit only the US layout), times the flattening
          // factor above so the map stays a panel, not a full-viewport wall.
          aspectRatio: `${(cols / rows) * TILE_WIDTH_TO_HEIGHT}`,
        }}
        role="group"
        aria-label={ariaLabel}
      >
        {tiles.map((tile) => {
          const count = countByCode.get(tile.code) ?? 0
          const active = tile.code === activeCode
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
              // CSS tooltip (::after reads this), not the native title attribute — browsers delay
              // a title by ~1s and that can't be configured; this shows instantly on hover/focus.
              data-tooltip={`${tile.name}: ${formatNumber(count)} recalls`}
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
