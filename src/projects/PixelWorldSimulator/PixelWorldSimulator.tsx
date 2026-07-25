import { useCallback, useRef, useState } from 'react'
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
  const [reading, setReading] = useState<CellReading | null>(null)

  const sim = usePixelWorld(canvasRef)

  const onStroke = useCallback(
    (from: CellPoint, to: CellPoint) => {
      if (tool === Tool.inspect) {
        setReading(sim.read(to))
        return
      }
      sim.paintStroke(from, to, material, radius)
    },
    [sim, tool, material, radius]
  )
  const brushHandlers = usePointerBrush(canvasRef, onStroke)

  const inspecting = tool === Tool.inspect

  return (
    <PageLayout>
      <PageHeader title="Pixel World Simulator">
        {isFunMode ? simCopy.taglineFun : simCopy.tagline}
      </PageHeader>

      <div className={styles.body}>
        <div className={styles.stage}>
          <canvas
            ref={canvasRef}
            className={`${styles.canvas} ${inspecting ? styles.identifying : ''}`}
            aria-label={
              inspecting
                ? 'Pixel world. Click a cell to see what it is.'
                : 'Pixel world. Draw materials with the pointer.'
            }
            {...brushHandlers}
          />
        </div>

        <Palette selected={material} onSelect={setMaterial} />

        <SimControls
          isPaused={sim.isPaused}
          tool={tool}
          radius={radius}
          onTogglePause={sim.togglePause}
          onStep={sim.stepOnce}
          onClear={sim.clear}
          onTool={setTool}
          onRadius={setRadius}
        />

        <p className={styles.hint} aria-live="polite">
          {inspecting ? describe(reading) : simCopy.hint}
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
