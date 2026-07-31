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
  /** Whether a layer can be singled out. In the fanned deck every layer is already visible, so the
   *  rail is labels only: hiding three of four plates there takes information away for nothing. */
  selectable: boolean
  onFocusLayer: (layer: number) => void
}

/**
 * One entry per layer, sitting level with the plate it names, so the stacking order is stated outright
 * rather than inferred from the perspective. In the cube each entry also singles that layer out.
 */
export function LayerRail({
  focusedLayer,
  mode,
  camera,
  spacing,
  stageHeight,
  railRef,
  selectable,
  onFocusLayer,
}: LayerRailProps) {
  const offsets = layerScreenOffsets(mode, spacing, camera)
  const middle = stageHeight / 2

  return (
    <div className={styles.rail} ref={railRef} data-rail>
      {Array.from({ length: BOARD_SIZE }, (_, layer) => {
        const isFocused = focusedLayer === layer
        const position = { top: `${middle + offsets[layer]}px` }
        const content = (
          <>
            <span className={styles.word}>{gameCopy.layerLabel}</span>
            <span>{layer + 1}</span>
          </>
        )

        if (!selectable) {
          return (
            <span key={layer} className={styles.label} style={position}>
              {content}
            </span>
          )
        }

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
            style={position}
            onClick={() => onFocusLayer(layer)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
