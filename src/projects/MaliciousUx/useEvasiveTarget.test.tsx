import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HOSTILITY } from './data'
import { useEvasiveTarget } from './useEvasiveTarget'

const ARENA = { width: 400, height: 200 }
const TARGET = { width: 40, height: 20 }

const rectOf = (box: { width: number; height: number }) => () =>
  ({
    left: 0,
    top: 0,
    width: box.width,
    height: box.height,
    right: box.width,
    bottom: box.height,
    x: 0,
    y: 0,
    toJSON: () => box,
  }) as DOMRect

function Subject() {
  const { arenaRef, targetRef, spot, dodges } = useEvasiveTarget(
    HOSTILITY.evadeRadius,
    HOSTILITY.hopDistance
  )

  return (
    <div ref={arenaRef} data-testid="arena">
      <button type="button" ref={targetRef} data-testid="target">
        No
      </button>
      <output data-testid="spot">{`${spot.x},${spot.y}`}</output>
      <output data-testid="dodges">{dodges}</output>
    </div>
  )
}

function renderSubject() {
  render(<Subject />)
  const arena = screen.getByTestId('arena')
  arena.getBoundingClientRect = rectOf(ARENA)
  Object.defineProperty(arena, 'clientWidth', { value: ARENA.width, configurable: true })
  Object.defineProperty(arena, 'clientHeight', { value: ARENA.height, configurable: true })
  screen.getByTestId('target').getBoundingClientRect = rectOf(TARGET)
  return { arena }
}

const spotNow = () => {
  const [x, y] = screen.getByTestId('spot').textContent!.split(',').map(Number)
  return { x, y }
}

const movePointerTo = (arena: HTMLElement, x: number, y: number) =>
  act(() => {
    arena.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }))
  })

afterEach(cleanup)

describe('useEvasiveTarget', () => {
  it('starts at rest, inset from the corner', () => {
    renderSubject()
    expect(spotNow()).toEqual({ x: 8, y: 8 })
    expect(screen.getByTestId('dodges').textContent).toBe('0')
  })

  it('ignores a pointer that stays outside the trigger radius', () => {
    const { arena } = renderSubject()

    movePointerTo(arena, ARENA.width, ARENA.height)

    expect(screen.getByTestId('dodges').textContent).toBe('0')
  })

  it('moves and counts a hop when the pointer closes in', () => {
    const { arena } = renderSubject()
    const before = spotNow()

    movePointerTo(arena, before.x + TARGET.width / 2, before.y + TARGET.height / 2)

    expect(spotNow()).not.toEqual(before)
    expect(screen.getByTestId('dodges').textContent).toBe('1')
  })

  it('stops hopping once the pointer backs off', () => {
    const { arena } = renderSubject()
    const start = spotNow()

    movePointerTo(arena, start.x + TARGET.width / 2, start.y + TARGET.height / 2)
    const settled = spotNow()
    movePointerTo(arena, ARENA.width, ARENA.height)

    expect(screen.getByTestId('dodges').textContent).toBe('1')
    expect(spotNow()).toEqual(settled)
  })

  /** The measured-position runaway: chasing it must never put it outside its pen. */
  it('keeps the target inside the arena however long the chase runs', () => {
    const { arena } = renderSubject()

    for (let chase = 0; chase < 30; chase += 1) {
      const at = spotNow()
      movePointerTo(arena, at.x + TARGET.width / 2 - 6, at.y + TARGET.height / 2)

      const now = spotNow()
      expect(now.x).toBeGreaterThanOrEqual(0)
      expect(now.y).toBeGreaterThanOrEqual(0)
      expect(now.x + TARGET.width).toBeLessThanOrEqual(ARENA.width)
      expect(now.y + TARGET.height).toBeLessThanOrEqual(ARENA.height)
    }
  })
})
