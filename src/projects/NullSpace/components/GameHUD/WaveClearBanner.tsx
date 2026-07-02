import { useEffect, useRef, useState } from 'react'
import { WAVES_PER_LEVEL } from '../../data'
import { GamePhase } from '../../engine/types'
import { useGameUIState } from '../../useGameUIState'
import styles from './WaveNotice.module.scss'

// How long the cleared flash lingers, in ms — matches the CSS animation length.
const CLEARED_FLASH_MS = 1800

// Flashes the wave you just cleared. Fires only on a mid-sector auto-advance —
// the wave counter climbs while play keeps running — so it never shows on the
// first wave, a sector shop, or a boss start, all of which cross a non-playing
// phase between waves.
export function WaveClearBanner() {
  const { wave, phase } = useGameUIState()
  const prevWave = useRef(wave)
  const prevPhase = useRef(phase)
  const [cleared, setCleared] = useState<number | null>(null)

  useEffect(() => {
    const advancedInPlay =
      phase === GamePhase.playing &&
      prevPhase.current === GamePhase.playing &&
      wave > prevWave.current &&
      prevWave.current >= 1
    const justCleared = prevWave.current
    prevWave.current = wave
    prevPhase.current = phase
    if (!advancedInPlay) return
    setCleared(justCleared)
    const timer = setTimeout(() => setCleared(null), CLEARED_FLASH_MS)
    return () => clearTimeout(timer)
  }, [wave, phase])

  if (cleared === null) return null
  const waveInLevel = ((cleared - 1) % WAVES_PER_LEVEL) + 1

  return (
    <div
      key={cleared}
      className={`${styles.pill} ${styles.cleared}`}
      role="status"
      aria-live="polite"
    >
      Wave {waveInLevel}/{WAVES_PER_LEVEL} cleared
    </div>
  )
}
