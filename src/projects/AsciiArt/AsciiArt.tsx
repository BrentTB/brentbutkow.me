import { useRef } from 'react'
import { BackButton } from '../../components/PageFormatting/BackButton'
import { SafeLink } from '../../components/utils/SafeLink'
import { useFunMode } from '../../contexts/useFunMode'
import { ColorMode, SourceKind } from './ascii-art.types'
import { useAsciiArt } from './useAsciiArt'
import { SourcePicker } from './components/SourcePicker/SourcePicker'
import { Controls } from './components/Controls/Controls'
import styles from './AsciiArt.module.scss'

export function AsciiArt() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    sourceKind,
    options,
    error,
    loadImage,
    loadVideo,
    startWebcam,
    reset,
    setColorMode,
    setRamp,
    setCols,
    setInvert,
  } = useAsciiArt(canvasRef, isFunMode ? ColorMode.color : ColorMode.grayscale)

  const hasSource = sourceKind !== SourceKind.none

  return (
    <div className={styles.wrapper}>
      <BackButton />

      <header className={styles.intro}>
        <h1 className={styles.title}>ASCII Art Studio</h1>
        <p className={styles.tagline}>
          Turn a photo, video, or your webcam into live ASCII art. A browser port of my{' '}
          <SafeLink href="https://github.com/BrentTB" className={styles.link}>
            Python vidToAscii
          </SafeLink>{' '}
          tool — video keeps its sound, since it just plays underneath.
        </p>
      </header>

      <SourcePicker
        hasSource={hasSource}
        error={error}
        onImage={loadImage}
        onVideo={loadVideo}
        onWebcam={startWebcam}
        onReset={reset}
      />

      <div className={styles.stage}>
        {hasSource ? (
          <canvas ref={canvasRef} className={styles.canvas} />
        ) : (
          <p className={styles.empty}>Pick an image, a video, or your webcam to begin.</p>
        )}
      </div>

      {hasSource && (
        <Controls
          options={options}
          onColorMode={setColorMode}
          onRamp={setRamp}
          onCols={setCols}
          onInvert={setInvert}
        />
      )}

      <p className={styles.privacy}>
        Everything runs in your browser — your photos, videos, and webcam never leave your device.
      </p>
    </div>
  )
}
