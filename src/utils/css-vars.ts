import { CSSProperties } from 'react'

/**
 * An inline style that may also carry CSS custom properties. React's `CSSProperties` rejects `--foo`
 * keys; boards and the online panel hand geometry and colours to CSS this way.
 */
export type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>

/**
 * Passes CSS custom properties through as an inline style. Checking the object in argument position
 * instead of against the `style` prop keeps that legal without a cast.
 */
export function cssVars(vars: StyleWithVars): CSSProperties {
  return vars
}
