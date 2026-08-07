import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { copy } from './data'
import { DoubleNegative } from './DoubleNegative'

afterEach(cleanup)

const confirmButton = () => screen.getByRole('button', { name: copy.confirm })

describe('DoubleNegative', () => {
  it('will not confirm until something is picked', () => {
    render(<DoubleNegative />)
    expect((confirmButton() as HTMLButtonElement).disabled).toBe(true)
  })

  it('translates the opt-in into words a person would use', () => {
    render(<DoubleNegative />)

    fireEvent.click(screen.getByRole('radio', { name: copy.optIn.label }))
    fireEvent.click(confirmButton())

    expect(screen.getByText(copy.optIn.plain)).toBeTruthy()
  })

  it('translates the opt-out too, so the trick is visible either way', () => {
    render(<DoubleNegative />)

    fireEvent.click(screen.getByRole('radio', { name: copy.optOut.label }))
    fireEvent.click(confirmButton())

    expect(screen.getByText(copy.optOut.plain)).toBeTruthy()
  })

  it('keeps the plain meaning back until the choice is committed', () => {
    render(<DoubleNegative />)

    fireEvent.click(screen.getByRole('radio', { name: copy.optIn.label }))

    expect(screen.queryByText(copy.optIn.plain)).toBeNull()
    expect(screen.getByText(copy.pending)).toBeTruthy()
  })
})
