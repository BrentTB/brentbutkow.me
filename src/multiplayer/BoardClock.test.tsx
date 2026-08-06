import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BoardClock } from './BoardClock'

afterEach(cleanup)

const label = (clock: string) => `${clock} left`

describe('BoardClock', () => {
  it('renders nothing when no clock is running', () => {
    const { container } = render(<BoardClock turnEndsAt={null} label={label} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the remaining time when a clock is running', () => {
    const soon = new Date(Date.now() + 30_000).toISOString()
    render(<BoardClock turnEndsAt={soon} label={label} />)
    const line = screen.getByText(/left$/)
    expect(line).toBeTruthy()
    expect(line.hasAttribute('data-low')).toBe(false)
  })

  it('flags the last few seconds as low', () => {
    const almost = new Date(Date.now() + 5_000).toISOString()
    render(<BoardClock turnEndsAt={almost} label={label} />)
    expect(screen.getByText(/left$/).getAttribute('data-low')).toBe('true')
  })
})
