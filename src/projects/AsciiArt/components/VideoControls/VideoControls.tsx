import { ChangeEvent } from 'react'
import { Playback } from '../../useAsciiArt'
import { PLAYBACK_SPEEDS } from '../../data'
import styles from './VideoControls.module.scss'

type VideoControlsProps = {
  playback: Playback
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onRate: (rate: number) => void
}

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoControls({ playback, onTogglePlay, onSeek, onRate }: VideoControlsProps) {
  const { isPlaying, currentTime, duration, rate } = playback
  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => onSeek(Number(e.target.value))

  return (
    <div className={styles.bar}>
      <button
        className={styles.play}
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <span className={styles.time}>{formatTime(currentTime)}</span>
      <input
        className={styles.scrubber}
        type="range"
        min={0}
        max={duration || 0}
        step={0.05}
        value={Math.min(currentTime, duration || 0)}
        onChange={handleSeek}
        aria-label="Seek"
      />
      <span className={styles.time}>{formatTime(duration)}</span>

      <div className={styles.speeds}>
        {PLAYBACK_SPEEDS.map((speed) => (
          <button
            key={speed}
            className={speed === rate ? styles.activeSpeed : ''}
            onClick={() => onRate(speed)}
          >
            {speed}×
          </button>
        ))}
      </div>
    </div>
  )
}
