import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { copy } from './data'
import { SwappedLabels } from './SwappedLabels'

afterEach(cleanup)

const safeButton = () => screen.getByRole('button', { name: copy.safe })
const destructiveButton = () => screen.getByRole('button', { name: copy.destructive })
const positions = () => `${destructiveButton().style.order}${safeButton().style.order}`

describe('SwappedLabels', () => {
  it('trades places when the pointer reaches the safe button', () => {
    render(<SwappedLabels />)
    const before = positions()

    fireEvent.pointerEnter(safeButton())

    expect(positions()).not.toBe(before)
  })

  /**
   * The swap moves a button under the cursor, and an unguarded handler read that as a fresh approach:
   * the pair flickered forever while the mouse sat still. One swap per approach, and the pointer has to
   * leave before the trick re-arms.
   */
  it('swaps once per approach rather than flickering under a still cursor', () => {
    render(<SwappedLabels />)

    fireEvent.pointerEnter(safeButton())
    const afterFirst = positions()
    fireEvent.pointerEnter(safeButton())
    fireEvent.pointerEnter(safeButton())

    expect(positions()).toBe(afterFirst)
  })

  it('re-arms once the pointer leaves, so chasing the safe button keeps working', () => {
    render(<SwappedLabels />)
    const start = positions()

    fireEvent.pointerEnter(safeButton())
    fireEvent.pointerLeave(safeButton())
    fireEvent.pointerEnter(safeButton())

    expect(positions()).toBe(start)
  })

  it('leaves the pair alone for a keyboard, and reports what was pressed', () => {
    render(<SwappedLabels />)
    const start = positions()

    fireEvent.click(safeButton())

    expect(positions()).toBe(start)
    expect(screen.getByText(copy.kept)).toBeTruthy()
  })

  it('reports the destructive press honestly too', () => {
    render(<SwappedLabels />)

    fireEvent.click(destructiveButton())

    expect(screen.getByText(copy.deleted)).toBeTruthy()
  })
})
