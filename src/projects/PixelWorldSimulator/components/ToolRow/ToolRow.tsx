import { Tool } from '../../pixel-world.types'
import { TOOLS } from '../../data'
import styles from './ToolRow.module.scss'

type ToolRowProps = {
  selected: Tool
  onSelect(tool: Tool): void
  isFullscreen: boolean
  /** Hidden where the browser has no Fullscreen API, rather than shown and broken. */
  canFullscreen: boolean
  onToggleFullscreen(): void
}

/** What the pointer does to the world: paint a material, or push, pull and temper what is already there. */
export function ToolRow({
  selected,
  onSelect,
  isFullscreen,
  canFullscreen,
  onToggleFullscreen,
}: ToolRowProps) {
  return (
    <div className={styles.column}>
      {canFullscreen && (
        <button
          type="button"
          className={styles.expand}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
        </button>
      )}

      <div className={styles.tools} role="group" aria-label="Tool">
        {TOOLS.map(({ tool, label, title }) => (
          <button
            key={tool}
            type="button"
            className={styles.tool}
            title={title}
            aria-pressed={tool === selected}
            onClick={() => onSelect(tool)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Corners pointing outward: the world about to take the screen. */
function ExpandIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M1.5 5V1.5H5M9 1.5h3.5V5M12.5 9v3.5H9M5 12.5H1.5V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** The same corners pointing in. */
function CollapseIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M5 1.5V5H1.5M12.5 5H9V1.5M9 12.5V9h3.5M1.5 9H5v3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
