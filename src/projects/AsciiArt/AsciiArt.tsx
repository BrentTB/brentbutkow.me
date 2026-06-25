import { useRef } from 'react'
import { BackButton } from '../../components/PageFormatting/BackButton'
import { SafeLink } from '../../components/utils/SafeLink'
import { useFunMode } from '../../contexts/useFunMode'
import { ColorMode, SourceKind } from './ascii-art.types'
import { useAsciiArt } from './useAsciiArt'
import { SourcePicker } from './components/SourcePicker/SourcePicker'
import { Controls } from './components/Controls/Controls'
import { VideoControls } from './components/VideoControls/VideoControls'
import styles from './AsciiArt.module.scss'

export function AsciiArt() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    sourceKind,
    options,
    playback,
    isRecording,
    error,
    loadImage,
    loadVideo,
    startWebcam,
    reset,
    togglePlay,
    seek,
    setRate,
    saveImage,
    toggleRecording,
    setColorMode,
    setBackground,
    setRamp,
    setRows,
    setInvert,
    setMirror,
  } = useAsciiArt(canvasRef, isFunMode ? ColorMode.color : ColorMode.grayscale)

  const hasSource = sourceKind !== SourceKind.none
  const canRecord = sourceKind === SourceKind.video && typeof MediaRecorder !== 'undefined'

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
          tool.
        </p>
      </header>

      <SourcePicker
        sourceKind={sourceKind}
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

      {sourceKind === SourceKind.video && (
        <VideoControls
          playback={playback}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onRate={setRate}
        />
      )}

      {hasSource && (
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={saveImage}>
            Save image
          </button>
          {canRecord && (
            <button
              className={`${styles.actionButton} ${isRecording ? styles.recording : ''}`}
              onClick={toggleRecording}
            >
              {isRecording ? 'Stop recording' : 'Record video'}
            </button>
          )}
        </div>
      )}

      {hasSource && (
        <Controls
          options={options}
          sourceKind={sourceKind}
          onColorMode={setColorMode}
          onBackground={setBackground}
          onRamp={setRamp}
          onRows={setRows}
          onInvert={setInvert}
          onMirror={setMirror}
        />
      )}

      <p className={styles.privacy}>
        Everything runs in your browser. Your photos, videos, and webcam never leave your device.
      </p>
    </div>
  )
}
