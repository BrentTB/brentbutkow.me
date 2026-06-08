import { useEffect } from 'react'
import { WAVES_PER_LEVEL } from '../data'
import sharedStyles from './OverlayShared.module.scss'

type WaveCompleteScreenProps = {
  wave: number
  level: number
  score: number
  onNextWave: () => void
}

export function WaveCompleteScreen({ wave, level, score, onNextWave }: WaveCompleteScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onNextWave()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNextWave])

  const waveInLevel = ((wave - 1) % WAVES_PER_LEVEL) + 1

  return (
    <>
      <h2 className={sharedStyles.title}>
        Wave {waveInLevel}/{WAVES_PER_LEVEL} Complete
      </h2>
      <p className={sharedStyles.stat}>Level {level}</p>
      <p className={sharedStyles.stat}>Score: {score}</p>
      <button className={sharedStyles.primaryBtn} onClick={onNextWave}>
        Next Wave
      </button>
    </>
  )
}
