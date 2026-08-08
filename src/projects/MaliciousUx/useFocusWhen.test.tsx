import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusWhen } from './useFocusWhen'

afterEach(cleanup)

function Probe({ startActive }: { startActive: boolean }) {
  const [active, setActive] = useState(startActive)
  const ref = useFocusWhen<HTMLButtonElement>(active)
  return (
    <>
      <button type="button" onClick={() => setActive((value) => !value)}>
        toggle
      </button>
      <button type="button" ref={ref}>
        target
      </button>
    </>
  )
}

const target = () => screen.getByRole('button', { name: 'target' })
const toggle = () => screen.getByRole('button', { name: 'toggle' })

describe('useFocusWhen', () => {
  it('does not steal focus on mount, even when it starts active', () => {
    render(<Probe startActive />)

    expect(document.activeElement).not.toBe(target())
  })

  it('focuses the target when the condition turns true', () => {
    render(<Probe startActive={false} />)

    fireEvent.click(toggle())

    expect(document.activeElement).toBe(target())
  })

  it('focuses again on a later false→true transition', () => {
    render(<Probe startActive={false} />)

    fireEvent.click(toggle()) // false → true, focuses
    fireEvent.blur(target())
    fireEvent.click(toggle()) // true → false
    fireEvent.click(toggle()) // false → true, focuses again

    expect(document.activeElement).toBe(target())
  })
})
