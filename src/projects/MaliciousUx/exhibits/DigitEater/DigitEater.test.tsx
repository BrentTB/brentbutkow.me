import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DIGITS_PER_MEAL } from '../../engine/hostile-format'
import { copy } from './data'
import { DigitEater } from './DigitEater'

afterEach(cleanup)

const field = () => screen.getByRole('textbox') as HTMLInputElement
const type = (digit: string) =>
  fireEvent.change(field(), { target: { value: field().value + digit } })

describe('DigitEater', () => {
  it('keeps the first digit and reads it as singular', () => {
    render(<DigitEater />)

    type('1')

    expect(screen.getByText(copy.count(1, 1))).toBeTruthy()
  })

  it('swallows a digit once a full meal is typed', () => {
    render(<DigitEater />)

    for (let i = 0; i < DIGITS_PER_MEAL; i += 1) type('9')

    expect(screen.getByText(copy.count(DIGITS_PER_MEAL, DIGITS_PER_MEAL - 1))).toBeTruthy()
  })

  it('eats a pasted number in the same proportion as typing it', () => {
    render(<DigitEater />)

    const pasted = '0123456789'
    fireEvent.change(field(), { target: { value: pasted } })

    const typed = pasted.length
    const kept = typed - Math.floor(typed / DIGITS_PER_MEAL)
    expect(screen.getByText(copy.count(typed, kept))).toBeTruthy()
    expect(kept).toBeLessThan(typed)
  })

  it('does not count a backspace as another digit typed', () => {
    render(<DigitEater />)

    for (let i = 0; i < DIGITS_PER_MEAL; i += 1) type('9')
    // Delete one shown digit: kept drops, but the typed count stays where it was.
    fireEvent.change(field(), { target: { value: field().value.slice(0, -1) } })

    expect(screen.getByText(copy.count(DIGITS_PER_MEAL, DIGITS_PER_MEAL - 2))).toBeTruthy()
  })
})
