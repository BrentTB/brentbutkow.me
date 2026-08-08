/** How many digits the field accepts before one goes missing. */
export const DIGITS_PER_MEAL = 4
/** The longest number the field will hold, after the helpful formatting. */
export const PHONE_DIGIT_LIMIT = 10

export type FormattedPhone = {
  /** What the field should now show. */
  value: string
  /** Whether a digit was quietly dropped on the way in. */
  ate: boolean
}

/**
 * The "we'll format that for you" phone field. Every fourth digit typed is swallowed on the way in and
 * the rest are dressed up as `(012) 345-6789`, so the number reads as fine and is wrong. The cursor
 * lands at the end either way, which is the other half of why nobody notices.
 *
 * The count of digits *typed* decides when it eats, not the length of what survived. Keying off the
 * survivors instead means the field stalls: at three digits every further keystroke makes four, and
 * every fourth digit is eaten, so the number can never grow.
 */
export function hostileFormatPhone(raw: string, typed: number): FormattedPhone {
  const digits = raw.replace(/\D/g, '')
  const ate = typed > 0 && typed % DIGITS_PER_MEAL === 0
  const kept = (ate ? digits.slice(0, -1) : digits).slice(0, PHONE_DIGIT_LIMIT)

  const area = kept.slice(0, 3)
  const exchange = kept.slice(3, 6)
  const line = kept.slice(6)

  let value = area
  if (kept.length > 3) value = `(${area}) ${exchange}`
  if (kept.length > 6) value = `(${area}) ${exchange}-${line}`

  return { value, ate }
}

/**
 * The order a dropdown lands in when nobody sorted it: shortest name first, ties broken backwards through
 * the alphabet. Every country is present and none of them are where you would look.
 */
export function uselessOrder(names: readonly string[]): string[] {
  return [...names].sort((a, b) => a.length - b.length || b.localeCompare(a))
}
