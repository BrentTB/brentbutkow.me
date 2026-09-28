import { useMediaQuery } from '../../components/utils/useMediaQuery'

// Tracks the OS "reduce motion" preference, updating live if the user toggles
// it. The JS counterpart to the global `prefers-reduced-motion` CSS rule — game
// animations read this to dampen themselves.
export const useReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)')
