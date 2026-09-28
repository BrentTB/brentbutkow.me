import { useMediaQuery } from '../../components/utils/useMediaQuery'

// Tracks whether the primary pointer is coarse (touch), updating live if it
// changes (e.g. a 2-in-1 switching modes). The tutorial reads this to swap
// "click" copy for "tap" and to drop the keyboard-only "press WASD" beat.
export const useCoarsePointer = (): boolean => useMediaQuery('(pointer: coarse)')
