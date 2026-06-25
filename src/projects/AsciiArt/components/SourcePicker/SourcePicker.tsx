import { ChangeEvent, useRef } from 'react'
import { SourceKind } from '../../ascii-art.types'
import styles from './SourcePicker.module.scss'

type SourcePickerProps = {
  sourceKind: SourceKind
  error: string | null
  onImage: (file: File) => void
  onVideo: (file: File) => void
  onWebcam: () => void
  onReset: () => void
}

export function SourcePicker({
  sourceKind,
  error,
  onImage,
  onVideo,
  onWebcam,
  onReset,
}: SourcePickerProps) {
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  const hasSource = sourceKind !== SourceKind.none
  // The webcam is a live feed you stop; a file is a source you clear.
  const resetLabel = sourceKind === SourceKind.webcam ? 'Stop' : 'Clear'

  const pick = (handler: (file: File) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handler(file)
    event.target.value = '' // allow re-picking the same file
  }

  return (
    <div className={styles.picker}>
      <div className={styles.buttons}>
        <button type="button" className={styles.button} onClick={() => imageInput.current?.click()}>
          Upload image
        </button>
        <button type="button" className={styles.button} onClick={() => videoInput.current?.click()}>
          Upload video
        </button>
        <button type="button" className={styles.button} onClick={onWebcam}>
          Use webcam
        </button>
        {hasSource && (
          <button type="button" className={`${styles.button} ${styles.reset}`} onClick={onReset}>
            {resetLabel}
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
