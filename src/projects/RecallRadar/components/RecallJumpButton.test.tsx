import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecallJumpButton } from './RecallJumpButton'

afterEach(cleanup)

describe('RecallJumpButton', () => {
  it('pluralizes the count and formats large numbers', () => {
    render(<RecallJumpButton count={1} onClick={() => {}} />)
    expect(screen.getByRole('button').textContent).toContain('See 1 recall')
    expect(screen.getByRole('button').textContent).not.toContain('recalls')
    cleanup()
    render(<RecallJumpButton count={27358} onClick={() => {}} />)
    expect(screen.getByRole('button').textContent).toContain('recalls')
    // Grouped, not a bare 27358.
    expect(screen.getByRole('button').textContent).toMatch(/27.358/)
  })

  it('fires onClick when pressed', () => {
    const onClick = vi.fn()
    render(<RecallJumpButton count={5} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
