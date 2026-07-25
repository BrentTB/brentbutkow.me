import { useCallback, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { CellPoint, CellReading, MaterialId } from './pixel-world.types'
import { BRUSH_RADIUS, DEFAULT_MATERIAL, simCopy } from './data'
import { MATERIALS } from './engine/materials'
import { usePixelWorld } from './usePixelWorld'
import { usePointerBrush } from './usePointerBrush'
import { Palette } from './components/Palette/Palette'
import { SimControls } from './components/SimControls/SimControls'
import styles from './PixelWorldSimulator.module.scss'

export function PixelWorldSimulator() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [material, setMaterial] = useState<MaterialId>(DEFAULT_MATERIAL)
  const [radius, setRadius] = useState(BRUSH_RADIUS.default)

  const sim = usePixelWorld(canvasRef)

  const onStroke = useCallback(
    (from: CellPoint, to: CellPoint) => sim.paintStroke(from, to, material, radius),
    [sim, material, radius]
  )

  // The readout always follows the pointer: no mode to turn on, and painting is never interrupted.
  const onHover = useCallback((cell: CellPoint | null) => sim.watch(cell), [sim])
  const brushHandlers = usePointerBrush(canvasRef, onStroke, onHover)

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

        <p className={styles.hint} aria-live="polite">
          {sim.reading === null ? simCopy.hint : <Reading reading={sim.reading} />}
        </p>
      </div>
    </PageLayout>
  )
}

/**
 * Temperature first, in a slot wide enough for the coldest and hottest readings the sim can produce. With
 * the material name first the number slid left and right as the pointer moved between a long name and a
 * short one, which made it unreadable while it was changing.
 */
function Reading({ reading }: { reading: CellReading }) {
  const { label } = MATERIALS[reading.material]
  // Air, not "empty": it holds a temperature and conducts, which is exactly what the readout shows.
  const name = reading.material === MaterialId.empty ? 'Air' : label

  const notes = [name]
  if (reading.material === MaterialId.source) {
    const producing =
      reading.producing === undefined ? simCopy.sourceEmpty : MATERIALS[reading.producing].label
    notes.push(`making ${producing}`)
  }
  if (reading.burning) notes.push('on fire')

  return (
    <>
      <span className={styles.temperature}>{reading.temperature}°C</span>
      {/* The gap is CSS, but the text needs a separator of its own or a screen reader runs the
          temperature straight into the material name. */}
      {` ${notes.join(' · ')}`}
    </>
  )
}
