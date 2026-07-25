import { useCallback, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { CellPoint, MaterialId, Tool } from './pixel-world.types'
import { BRUSH_RADIUS, DEFAULT_MATERIAL, simCopy } from './data'
import { useFullscreen } from './useFullscreen'
import { usePixelWorld } from './usePixelWorld'
import { usePointerBrush } from './usePointerBrush'
import { Palette } from './components/Palette/Palette'
import { ToolRow } from './components/ToolRow/ToolRow'
import { Reading } from './components/Reading/Reading'
import { SimControls } from './components/SimControls/SimControls'
import styles from './PixelWorldSimulator.module.scss'

/** What to say when the pointer is off the canvas and there is no reading to show. */
function hintFor(tool: Tool): string {
  return tool === Tool.paint ? simCopy.hint : simCopy.toolHints[tool]
}

export function PixelWorldSimulator() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The whole working area goes full screen, not just the canvas: the tools and palette have to come too.
  const bodyRef = useRef<HTMLDivElement>(null)
  const fullscreen = useFullscreen(bodyRef)

  const [material, setMaterial] = useState<MaterialId>(DEFAULT_MATERIAL)
  const [tool, setTool] = useState<Tool>(Tool.paint)
  const [radius, setRadius] = useState(BRUSH_RADIUS.default)

  const sim = usePixelWorld(canvasRef)

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
  const brushHandlers = usePointerBrush(canvasRef, onStroke, watch)

  return (
    <PageLayout>
      <PageHeader title="Pixel World Simulator">
        {isFunMode ? simCopy.taglineFun : simCopy.tagline}
      </PageHeader>

      <div
        ref={bodyRef}
        className={`${styles.body} ${fullscreen.isFullscreen ? styles.filling : ''}`}
      >
        <div className={styles.world}>
          <div className={styles.stage}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              aria-label="Pixel world. Draw materials with the pointer."
              {...brushHandlers}
            />
          </div>

          <ToolRow
            selected={tool}
            onSelect={setTool}
            isFullscreen={fullscreen.isFullscreen}
            canFullscreen={fullscreen.supported}
            onToggleFullscreen={fullscreen.toggle}
          />
        </div>

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
        />

        {/* No live region: the readout refreshes ten times a second while the pointer moves, which a
            screen reader would read out as an unbroken stream of temperatures. */}
        <p className={styles.hint}>
          {sim.reading === null ? hintFor(tool) : <Reading reading={sim.reading} />}
        </p>
      </div>
    </PageLayout>
  )
}
