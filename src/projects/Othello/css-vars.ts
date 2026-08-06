import { CSSProperties } from 'react'
import { StyleWithVars } from './othello.types'

/**
 * Passes CSS custom properties through as an inline style. React's `CSSProperties` rejects `--foo`
 * keys, and checking the object in argument position instead of against the `style` prop keeps that
 * legal without a cast. The board hands its geometry to CSS this way.
 */
export function cssVars(vars: StyleWithVars): CSSProperties {
  return vars
}
