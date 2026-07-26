import { useCallback, useEffect, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { CellPoint, MaterialId, Tool } from './pixel-world.types'
import { BRUSH_RADIUS, DEFAULT_MATERIAL, PALETTE_SHEET_QUERY, SIDEBAR_GAP, simCopy } from './data'
import { useMediaQuery } from '../../components/utils/useMediaQuery'
import { useElementHeight } from './useElementHeight'
import { useFullscreen } from './useFullscreen'
import { usePixelWorld } from './usePixelWorld'
import { useSimSettings } from './useSimSettings'
import { useShareLink } from './useShareLink'
import { usePointerBrush } from './usePointerBrush'
import { Palette } from './components/Palette/Palette'
import { ToolRow } from './components/ToolRow/ToolRow'
import { Census } from './components/Census/Census'
import { Reading } from './components/Reading/Reading'
import { SimControls } from './components/SimControls/SimControls'
import { SettingsDialog } from './components/SettingsDialog/SettingsDialog'
import styles from './PixelWorldSimulator.module.scss'

/** What to say when the pointer is off the canvas and there is no reading to show. */
function hintFor(tool: Tool, touch: boolean): string {
  if (tool !== Tool.paint) return simCopy.toolHints[tool]
  return touch ? simCopy.hintTouch : simCopy.hint
}

export function PixelWorldSimulator() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The whole working area goes full screen, not just the canvas: the tools and palette have to come too.
  const bodyRef = useRef<HTMLDivElement>(null)
  const fullscreen = useFullscreen(bodyRef)

  // No hover on a touch screen, so no readout: the only way to touch the world is to draw on it, and a line
  // that swapped between two lines of hint and one of reading shifted the page every time a finger landed.
  const touchOnly = useMediaQuery(PALETTE_SHEET_QUERY)

  const [material, setMaterial] = useState<MaterialId>(DEFAULT_MATERIAL)
  const [tool, setTool] = useState<Tool>(Tool.paint)
  const [radius, setRadius] = useState(BRUSH_RADIUS.default)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { settings, toggle: toggleSetting } = useSimSettings()

  // How much room is left beside the canvas once the tools have had theirs. The canvas takes its height from
  // its own aspect ratio, so this can only be measured — and without it the tally runs on past the bottom of
  // the world and leaves a column of dead space next to it.
  const stageRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const stageHeight = useElementHeight(stageRef)
  const toolsHeight = useElementHeight(toolsRef)
  const censusRoom = stageHeight === 0 ? 0 : Math.max(0, stageHeight - toolsHeight - SIDEBAR_GAP)

  const sim = usePixelWorld(canvasRef)

  // The renderer holds the settings in a ref, so the saved ones have to be handed over once on mount.
  const { applySettings } = sim
  useEffect(() => applySettings(settings), [applySettings, settings])

  const { snapshot, loadSnapshot } = sim
  const link = useShareLink({ snapshot, loadSnapshot })

  // Depend on the two callbacks rather than on `sim`, whose identity changes every time the readout
  // refreshes — otherwise the canvas re-registers all five pointer listeners ten times a second.
  const { paintStroke, applyForce, watch } = sim
  const onStroke = useCallback(
    (from: CellPoint, to: CellPoint) => {
      if (tool === Tool.paint) paintStroke(from, to, material, radius)
      else applyForce(tool, from, to, radius)
    },
    [tool, paintStroke, applyForce, material, radius]
  )

  // The readout always follows the pointer: no mode to turn on, and painting is never interrupted.
  const brushHandlers = usePointerBrush(canvasRef, onStroke, touchOnly ? undefined : watch)

  return (
    <PageLayout>
      <PageHeader title="Pixel World Simulator">
        {isFunMode ? simCopy.taglineFun : simCopy.tagline}
      </PageHeader>

      <div
        ref={bodyRef}
        className={[
          styles.body,
          fullscreen.isFullscreen ? styles.filling : '',
          fullscreen.isPseudo ? styles.pseudo : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className={styles.world}>
          <div className={styles.stage} ref={stageRef}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              aria-label="Pixel world. Draw materials with the pointer."
              {...brushHandlers}
            />
          </div>

          <div className={styles.sidebar}>
            <div ref={toolsRef}>
              <ToolRow
                selected={tool}
                onSelect={setTool}
                isFullscreen={fullscreen.isFullscreen}
                canFullscreen={fullscreen.supported}
                onToggleFullscreen={fullscreen.toggle}
                isSettingsOpen={isSettingsOpen}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>

            <div className={styles.tally}>
              <Census counts={sim.census} onWatch={sim.watchCensus} room={censusRoom} />
            </div>
          </div>
        </div>

        {/* Everything that is not the world. `display: contents` normally, so this wrapper changes nothing —
            on a phone held sideways it becomes the column beside the world instead. */}
        <div className={styles.deck}>
          {/* Picking a material means you want to draw it, so it takes the brush back off a force tool. */}
          <Palette
            selected={material}
            onSelect={(picked) => {
              setMaterial(picked)
              setTool(Tool.paint)
            }}
          />

          <SimControls
            isPaused={sim.isPaused}
            speed={sim.speed}
            radius={radius}
            onTogglePause={sim.togglePause}
            onSpeed={sim.setSpeed}
            onStep={sim.stepOnce}
            onClear={sim.clear}
            onRadius={setRadius}
            onLoad={sim.load}
            canShare={link.supported}
            shareOutcome={link.outcome}
            onShare={link.share}
          />

          {/* No live region: the readout refreshes ten times a second while the pointer moves, which a
              screen reader would read out as an unbroken stream of temperatures. A note about a link
              outranks the tool hint while it is up: it answers something the visitor just did. */}
          <p className={styles.hint}>
            {sim.reading !== null ? (
              <Reading reading={sim.reading} />
            ) : (
              (link.note ?? hintFor(tool, touchOnly))
            )}
          </p>
        </div>

        {/* Inside the element that goes full screen, so the dialog is still there in full screen. */}
        {isSettingsOpen && (
          <SettingsDialog
            settings={settings}
            onToggle={toggleSetting}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </div>
    </PageLayout>
  )
}
