import { useCallback, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { CellPoint, MaterialId } from './pixel-world.types'
import { BRUSH_RADIUS, PAINTABLE_MATERIALS, simCopy } from './data'
import { usePixelWorld } from './usePixelWorld'
import { usePointerBrush } from './usePointerBrush'
import { Palette } from './components/Palette/Palette'
import { SimControls } from './components/SimControls/SimControls'
import styles from './PixelWorldSimulator.module.scss'

export function PixelWorldSimulator() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [material, setMaterial] = useState<MaterialId>(MaterialId.sand)
  const [radius, setRadius] = useState(BRUSH_RADIUS.default)

  const sim = usePixelWorld(canvasRef)

  const paint = useCallback(
    (from: CellPoint, to: CellPoint) => sim.paintStroke(from, to, material, radius),
    [sim, material, radius]
  )
  const brushHandlers = usePointerBrush(canvasRef, paint)

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

        <Palette materials={PAINTABLE_MATERIALS} selected={material} onSelect={setMaterial} />

        <SimControls
          isPaused={sim.isPaused}
          radius={radius}
          onTogglePause={sim.togglePause}
          onStep={sim.stepOnce}
          onClear={sim.clear}
          onRadius={setRadius}
        />

        <p className={styles.hint}>{simCopy.hint}</p>
      </div>
    </PageLayout>
  )
}
