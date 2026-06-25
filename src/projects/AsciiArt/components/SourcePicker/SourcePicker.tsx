import { ChangeEvent, useRef } from 'react'
import styles from './SourcePicker.module.scss'

type SourcePickerProps = {
  hasSource: boolean
  error: string | null
  onImage: (file: File) => void
  onVideo: (file: File) => void
  onWebcam: () => void
  onReset: () => void
}

export function SourcePicker({
  hasSource,
  error,
  onImage,
  onVideo,
  onWebcam,
  onReset,
}: SourcePickerProps) {
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  const pick = (handler: (file: File) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handler(file)
    event.target.value = '' // allow re-picking the same file
  }

  return (
    <div className={styles.picker}>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={() => imageInput.current?.click()}>
          Upload image
        </button>
        <button className={styles.button} onClick={() => videoInput.current?.click()}>
          Upload video
        </button>
        <button className={styles.button} onClick={onWebcam}>
          Use webcam
        </button>
        {hasSource && (
          <button className={`${styles.button} ${styles.reset}`} onClick={onReset}>
            Clear
          </button>
        )}
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={pick(onImage)}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className={styles.hiddenInput}
        onChange={pick(onVideo)}
      />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
