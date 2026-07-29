import { useMediaQuery } from '../../../../components/utils/useMediaQuery'
import { Tool } from '../../pixel-world.types'
import { PALETTE_SHEET_QUERY, simCopy } from '../../data'
import { ToolButtons } from './ToolButtons'
import styles from './ToolRow.module.scss'

type ToolRowProps = {
  selected: Tool
  onSelect(tool: Tool): void
  isFullscreen: boolean
  /** Hidden where the browser has no Fullscreen API, rather than shown and broken. */
  canFullscreen: boolean
  onToggleFullscreen(): void
  isSettingsOpen: boolean
  onOpenSettings(): void
}

/** What the pointer does to the world: paint a material, or push, pull and temper what is already there. */
export function ToolRow({
  selected,
  onSelect,
  isFullscreen,
  canFullscreen,
  onToggleFullscreen,
  isSettingsOpen,
  onOpenSettings,
}: ToolRowProps) {
  // On a phone the page puts the buttons on the material chip's line instead, so the column keeps only the two
  // controls that act on the screen rather than on the world.
  const besidePalette = useMediaQuery(PALETTE_SHEET_QUERY)

  return (
    <div className={styles.column}>
      {/* Two controls for the view rather than the world, so they share a row above the tools. */}
      <div className={styles.view}>
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

        <button
          type="button"
          className={styles.gear}
          aria-label={simCopy.settings.open}
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          onClick={onOpenSettings}
        >
          <GearIcon />
        </button>
      </div>

      {!besidePalette && <ToolButtons selected={selected} onSelect={onSelect} />}
    </div>
  )
}

/**
 * A rim with six stubby teeth. Teeth any longer or thinner and it reads as a sun at this size, which is
 * the wrong idea entirely.
 */
function GearIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M11 7h2M1 7h2M9 10.46l1 1.74M4 1.8l1 1.74M5 10.46l-1 1.74M10 1.8l-1 1.74"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="7" r="1.3" fill="currentColor" />
    </svg>
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
