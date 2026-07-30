import { RefObject } from 'react'
import { Camera, ViewMode } from '../../tic-tac-toe.types'
import { layerScreenOffsets } from '../../engine/geometry'
import { BOARD_SIZE } from '../../engine/lines'
import { gameCopy } from '../../data'
import styles from './LayerRail.module.scss'

interface LayerRailProps {
  focusedLayer: number | null
  mode: ViewMode
  camera: Camera
  spacing: number
  /** Height of the stage, so each button can be placed relative to its middle. */
  stageHeight: number
  railRef: RefObject<HTMLDivElement>
  isDragging: boolean
  onFocusLayer: (layer: number) => void
}

/**
 * A button per layer, sitting level with the plate it selects. It doubles as the layer labels, so the
 * stacking order is named outright rather than inferred from the perspective.
 */
export function LayerRail({
  focusedLayer,
  mode,
  camera,
  spacing,
  stageHeight,
  railRef,
  isDragging,
  onFocusLayer,
}: LayerRailProps) {
  const offsets = layerScreenOffsets(mode, spacing, camera)
  const middle = stageHeight / 2

  return (
    <div className={styles.rail} ref={railRef} data-rail data-dragging={isDragging || undefined}>
      {Array.from({ length: BOARD_SIZE }, (_, layer) => {
        const isFocused = focusedLayer === layer
        return (
          <button
            key={layer}
            type="button"
            aria-pressed={isFocused}
            aria-label={
              isFocused
                ? gameCopy.releaseFocusLabel(layer + 1)
                : gameCopy.focusLayerLabel(layer + 1)
            }
            style={{ top: `${middle + offsets[layer]}px` }}
            onClick={() => onFocusLayer(layer)}
          >
            <span className={styles.word}>{gameCopy.layerLabel}</span>
            <span>{layer + 1}</span>
          </button>
        )
      })}
    </div>
  )
}
