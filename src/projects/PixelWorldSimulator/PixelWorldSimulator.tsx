import { useCallback, useEffect, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { CellPoint, CellReading, MaterialId, Tool } from './pixel-world.types'
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
  const [tool, setTool] = useState<Tool>(Tool.paint)

  const sim = usePixelWorld(canvasRef)
  const identifying = tool === Tool.inspect

  const onStroke = useCallback(
    (from: CellPoint, to: CellPoint) => sim.paintStroke(from, to, material, radius),
    [sim, material, radius]
  )

  // Identify follows the pointer rather than taking its clicks, so the brush keeps working while a
  // reading sits there updating itself.
  const onHover = useCallback(
    (cell: CellPoint | null) => {
      if (identifying) sim.watch(cell)
    },
    [identifying, sim]
  )
  const brushHandlers = usePointerBrush(canvasRef, onStroke, onHover)

  useEffect(() => {
    if (!identifying) sim.watch(null)
  }, [identifying, sim])

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
          tool={tool}
          radius={radius}
          onTogglePause={sim.togglePause}
          onSpeed={sim.setSpeed}
          onStep={sim.stepOnce}
          onClear={sim.clear}
          onTool={setTool}
          onRadius={setRadius}
        />

        <p className={styles.hint} aria-live="polite">
          {identifying ? describe(sim.reading) : simCopy.hint}
        </p>
      </div>
    </PageLayout>
  )
}

function describe(reading: CellReading | null): string {
  if (reading === null) return simCopy.identifyHint

  const { label } = MATERIALS[reading.material]
  // Air, not "empty": it holds a temperature and conducts, which is exactly what the readout shows.
  const name = reading.material === MaterialId.empty ? 'Air' : label
  const state = reading.burning ? ' · on fire' : ''
  return `${name} · ${reading.temperature}°C${state}`
}
