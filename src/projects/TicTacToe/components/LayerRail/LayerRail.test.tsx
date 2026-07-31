import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LayerRail } from './LayerRail'
import { gameCopy } from '../../data'
import { BOARD_SIZE } from '../../engine/lines'
import { VIEW_LAYOUTS } from '../../engine/geometry'
import { ViewMode } from '../../tic-tac-toe.types'

afterEach(cleanup)

function renderRail(overrides: Partial<Parameters<typeof LayerRail>[0]> = {}) {
  const onFocusLayer = vi.fn()
  const layout = VIEW_LAYOUTS[ViewMode.orbit]
  render(
    <LayerRail
      focusedLayer={null}
      mode={ViewMode.orbit}
      camera={{ yaw: layout.yaw, pitch: layout.pitch, zoom: 1 }}
      spacing={40}
      stageHeight={400}
      railRef={createRef<HTMLDivElement>()}
      selectable
      onFocusLayer={onFocusLayer}
      {...overrides}
    />
  )
  return { onFocusLayer }
}

describe('LayerRail', () => {
  it('names every layer', () => {
    renderRail()
    expect(screen.getAllByRole('button')).toHaveLength(BOARD_SIZE)
    expect(screen.getByRole('button', { name: gameCopy.focusLayerLabel(1) })).toBeTruthy()
  })

  it('asks for a layer to be singled out', () => {
    const { onFocusLayer } = renderRail()

    fireEvent.click(screen.getByRole('button', { name: gameCopy.focusLayerLabel(3) }))

    expect(onFocusLayer).toHaveBeenCalledWith(2)
  })

  /** The same button releases the layer again, and says so rather than repeating the first label. */
  it('offers to release the layer it is already showing', () => {
    const { onFocusLayer } = renderRail({ focusedLayer: 2 })

    const active = screen.getByRole('button', { name: gameCopy.releaseFocusLabel(3) })
    expect(active.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(active)
    expect(onFocusLayer).toHaveBeenCalledWith(2)
  })

  /**
   * In the fanned deck every layer is already visible, so the rail is labels only: hiding three of four
   * plates there would take information away for nothing.
   */
  it('is labels only where a layer cannot be singled out', () => {
    renderRail({ selectable: false, mode: ViewMode.fanned })

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByText(gameCopy.layerLabel)).toHaveLength(BOARD_SIZE)
  })
})
