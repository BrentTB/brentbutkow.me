import { useCallback, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { CellPoint, MaterialId } from './pixel-world.types'
import { BRUSH_RADIUS, DEFAULT_MATERIAL, simCopy } from './data'
import { usePixelWorld } from './usePixelWorld'
import { usePointerBrush } from './usePointerBrush'
import { Palette } from './components/Palette/Palette'
import { Reading } from './components/Reading/Reading'
import { SimControls } from './components/SimControls/SimControls'
import styles from './PixelWorldSimulator.module.scss'

export function PixelWorldSimulator() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [material, setMaterial] = useState<MaterialId>(DEFAULT_MATERIAL)
  const [radius, setRadius] = useState(BRUSH_RADIUS.default)

  const sim = usePixelWorld(canvasRef)

  // Depend on the two callbacks rather than on `sim`, whose identity changes every time the readout
  // refreshes — otherwise the canvas re-registers all five pointer listeners ten times a second.
  const { paintStroke, watch } = sim
  const onStroke = useCallback(
    (from: CellPoint, to: CellPoint) => paintStroke(from, to, material, radius),
    [paintStroke, material, radius]
  )

  // The readout always follows the pointer: no mode to turn on, and painting is never interrupted.
  const brushHandlers = usePointerBrush(canvasRef, onStroke, watch)

  return (
    <PageLayout>
      <PageHeader title="Pixel World Simulator">
        {isFunMode ? simCopy.taglineFun : simCopy.tagline}
      </PageHeader>

      <div className={styles.body}>
        <div className={styles.stage}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            aria-label="Pixel world. Draw materials with the pointer."
            {...brushHandlers}
          />
        </div>

        <Palette selected={material} onSelect={setMaterial} />

        <SimControls
          isPaused={sim.isPaused}
          speed={sim.speed}
          radius={radius}
          onTogglePause={sim.togglePause}
          onSpeed={sim.setSpeed}
          onStep={sim.stepOnce}
          onClear={sim.clear}
          onRadius={setRadius}
        />

        {/* No live region: the readout refreshes ten times a second while the pointer moves, which a
            screen reader would read out as an unbroken stream of temperatures. */}
        <p className={styles.hint}>
          {sim.reading === null ? simCopy.hint : <Reading reading={sim.reading} />}
        </p>
      </div>
    </PageLayout>
  )
}
