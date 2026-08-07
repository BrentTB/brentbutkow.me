import { describe, expect, it } from 'vitest'
import {
  DIGITS_PER_MEAL,
  hostileFormatPhone,
  PHONE_DIGIT_LIMIT,
  uselessOrder,
} from './hostile-format'

const digitsIn = (value: string) => value.replace(/\D/g, '').length

/** Types `count` digits one at a time, the way the field is actually used. */
function typeDigits(count: number) {
  let value = ''
  let ate = 0

  for (let typed = 1; typed <= count; typed += 1) {
    const result = hostileFormatPhone(`${value}9`, typed)
    if (result.ate) ate += 1
    value = result.value
  }

  return { value, ate, kept: digitsIn(value) }
}

describe('hostileFormatPhone', () => {
  it('keeps every digit until the field gets hungry', () => {
    const { value, ate } = hostileFormatPhone('1'.repeat(DIGITS_PER_MEAL - 1), DIGITS_PER_MEAL - 1)

    expect(ate).toBe(false)
    expect(digitsIn(value)).toBe(DIGITS_PER_MEAL - 1)
  })

  it('swallows one digit every time the typed count reaches a full meal', () => {
    const { value, ate } = hostileFormatPhone('1'.repeat(DIGITS_PER_MEAL), DIGITS_PER_MEAL)

    expect(ate).toBe(true)
    expect(digitsIn(value)).toBe(DIGITS_PER_MEAL - 1)
  })

  it('dresses the survivors up as a phone number', () => {
    expect(hostileFormatPhone('0123456789', 1).value).toBe('(012) 345-6789')
  })

  it('never holds more than the limit', () => {
    const value = hostileFormatPhone('9'.repeat(PHONE_DIGIT_LIMIT + 6), 1).value
    expect(digitsIn(value)).toBeLessThanOrEqual(PHONE_DIGIT_LIMIT)
  })

  it('ignores anything that is not a digit', () => {
    expect(hostileFormatPhone('(01) 2-3', 3).value).toBe(hostileFormatPhone('0123', 3).value)
  })

  it('leaves an empty field empty and unpunished', () => {
    expect(hostileFormatPhone('', 0)).toEqual({ value: '', ate: false })
  })

  // The stall this guards against shipped once: eating on the surviving length instead of the typed
  // count froze the field at three digits, because every keystroke after that made a fourth and lost it.
  it('keeps growing as you type past the first swallowed digit', () => {
    expect(typeDigits(DIGITS_PER_MEAL - 1).kept).toBe(DIGITS_PER_MEAL - 1)
    expect(typeDigits(DIGITS_PER_MEAL).kept).toBe(DIGITS_PER_MEAL - 1)
    expect(typeDigits(DIGITS_PER_MEAL + 1).kept).toBe(DIGITS_PER_MEAL)
  })

  it('loses one digit per meal over a whole number', () => {
    const typed = PHONE_DIGIT_LIMIT + 2
    const { ate, kept } = typeDigits(typed)

    expect(ate).toBe(Math.floor(typed / DIGITS_PER_MEAL))
    expect(kept).toBe(typed - ate)
  })
})

describe('uselessOrder', () => {
  it('puts the shortest names first and breaks ties backwards', () => {
    expect(uselessOrder(['Chad', 'Argentina', 'Togo', 'Peru'])).toEqual([
      'Togo',
      'Peru',
      'Chad',
      'Argentina',
    ])
  })

  it('keeps every entry and leaves the input alone', () => {
    const input = ['Belgium', 'Fiji', 'Nepal']
    const ordered = uselessOrder(input)

    expect(ordered).toHaveLength(input.length)
    expect([...ordered].sort()).toEqual([...input].sort())
    expect(input).toEqual(['Belgium', 'Fiji', 'Nepal'])
  })
})
