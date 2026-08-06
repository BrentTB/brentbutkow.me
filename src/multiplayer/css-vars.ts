import { CSSProperties } from 'react'

/**
 * An inline style that may also carry CSS custom properties. React's `CSSProperties` rejects `--foo`
 * keys; the online panel passes a seat's colour to CSS this way.
 */
export type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>

/** Passes CSS custom properties through as an inline style, checked in argument position. */
export function cssVars(vars: StyleWithVars): CSSProperties {
  return vars
}
