import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { PointerEvent as ReactPointerEvent } from 'react'
import { renderHook, cleanup } from '@testing-library/react'
import { CellPoint } from './pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH } from './data'
import { usePointerBrush } from './usePointerBrush'

/** A canvas displayed at twice the grid's resolution, offset 20px from the viewport corner. */
function mockCanvas(width = GRID_WIDTH * 2, height = GRID_HEIGHT * 2) {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () => ({ left: 20, top: 20, width, height }) as unknown as DOMRect
  canvas.setPointerCapture = vi.fn()
  canvas.releasePointerCapture = vi.fn()
  canvas.hasPointerCapture = vi.fn().mockReturnValue(true)
  return canvas
}

function pointerEvent(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  return {
    clientX,
    clientY,
    pointerId: 7,
    currentTarget: canvas,
  } as unknown as ReactPointerEvent<HTMLCanvasElement>
}

function mountBrush(canvas: HTMLCanvasElement) {
  const strokes: [CellPoint, CellPoint][] = []
  const hovers: (CellPoint | null)[] = []
  const rendered = renderHook(() =>
    usePointerBrush(
      { current: canvas },
      (from, to) => strokes.push([from, to]),
      (cell) => hovers.push(cell)
    )
  )
  return { ...rendered, strokes, hovers }
}

let nextFrame: FrameRequestCallback | null = null

/** Runs the hook's own pour loop one frame forward. */
function frame() {
  const callback = nextFrame
  nextFrame = null
  callback?.(0)
}

beforeEach(() => {
  nextFrame = null
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextFrame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    nextFrame = null
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('usePointerBrush', () => {
  it('keeps painting the same cell while the pointer is held still', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 120, 60))
    frame()
    frame()

    expect(strokes).toHaveLength(3)
    expect(strokes.at(-1)).toEqual([
      { x: 50, y: 20 },
      { x: 50, y: 20 },
    ])
  })

  it('stops pouring once the pointer is released', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 120, 60))
    result.current.onPointerUp(pointerEvent(canvas, 120, 60))
    frame()
    frame()

    expect(strokes).toHaveLength(1)
  })

  it('stops the pour loop on unmount', () => {
    const canvas = mockCanvas()
    const { result, strokes, unmount } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 120, 60))
    unmount()
    frame()

    expect(strokes).toHaveLength(1)
  })

  it('maps a press to the cell under the pointer', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 120, 60))

    // 100px into a canvas drawn at 2x = cell 50; 40px down = cell 20.
    expect(strokes).toEqual([
      [
        { x: 50, y: 20 },
        { x: 50, y: 20 },
      ],
    ])
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('reports each drag segment from the previous sample', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 20, 20))
    result.current.onPointerMove(pointerEvent(canvas, 40, 20))
    result.current.onPointerMove(pointerEvent(canvas, 60, 40))

    expect(strokes.slice(1)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 20, y: 10 },
      ],
    ])
  })

  it('ignores movement with no button held', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerMove(pointerEvent(canvas, 100, 100))

    expect(strokes).toEqual([])
  })

  it('reports where the pointer is even with no button held', () => {
    const canvas = mockCanvas()
    const { result, hovers } = mountBrush(canvas)

    // What the identify readout follows: it has to work without taking the click that paints.
    result.current.onPointerMove(pointerEvent(canvas, 120, 60))

    expect(hovers).toEqual([{ x: 50, y: 20 }])
  })

  it('reports hover and paints from the same drag', () => {
    const canvas = mockCanvas()
    const { result, strokes, hovers } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 20, 20))
    result.current.onPointerMove(pointerEvent(canvas, 60, 40))

    expect(strokes).toHaveLength(2)
    expect(hovers).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 10 },
    ])
  })

  it('clears the hover when the pointer leaves', () => {
    const canvas = mockCanvas()
    const { result, hovers } = mountBrush(canvas)

    result.current.onPointerMove(pointerEvent(canvas, 120, 60))
    result.current.onPointerLeave(pointerEvent(canvas, 120, 60))

    expect(hovers.at(-1)).toBeNull()
  })

  it('stops painting after the press ends', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 40, 40))
    result.current.onPointerUp(pointerEvent(canvas, 40, 40))
    result.current.onPointerMove(pointerEvent(canvas, 200, 200))

    expect(strokes).toHaveLength(1)
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7)
  })

  it('treats a cancelled pointer as a released one', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 40, 40))
    result.current.onPointerCancel(pointerEvent(canvas, 40, 40))
    result.current.onPointerMove(pointerEvent(canvas, 200, 200))

    expect(strokes).toHaveLength(1)
  })

  it('leaves an uncaptured pointer alone', () => {
    const canvas = mockCanvas()
    canvas.hasPointerCapture = vi.fn().mockReturnValue(false)
    const { result } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 40, 40))
    result.current.onPointerUp(pointerEvent(canvas, 40, 40))

    expect(canvas.releasePointerCapture).not.toHaveBeenCalled()
  })

  it('clamps a drag that leaves the canvas into the grid', () => {
    const canvas = mockCanvas()
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, -500, -500))
    result.current.onPointerMove(pointerEvent(canvas, 99_999, 99_999))

    expect(strokes[0][0]).toEqual({ x: 0, y: 0 })
    expect(strokes[1][1]).toEqual({ x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 })
  })

  it('reports nothing while the canvas has no layout', () => {
    const canvas = mockCanvas(0, 0)
    const { result, strokes } = mountBrush(canvas)

    result.current.onPointerDown(pointerEvent(canvas, 20, 20))

    expect(strokes).toEqual([])
    expect(canvas.setPointerCapture).not.toHaveBeenCalled()
  })
})
