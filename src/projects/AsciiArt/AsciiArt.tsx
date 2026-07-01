import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BackButton } from '../../components/PageFormatting/BackButton'
import { SafeLink } from '../../components/utils/SafeLink'
import { useFunMode } from '../../contexts/useFunMode'
import { ColorMode, SourceKind, SourceOrigin } from './ascii-art.types'
import { useAsciiArt } from './useAsciiArt'
import { parseAsciiParams, serializeAsciiParams } from './ascii-url'
import { SourcePicker } from './components/SourcePicker/SourcePicker'
import { Controls } from './components/Controls/Controls'
import { VideoControls } from './components/VideoControls/VideoControls'
import styles from './AsciiArt.module.scss'

export function AsciiArt() {
  const { isFunMode } = useFunMode()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse the URL once for initial hydration; from then on state drives the URL.
  const initialRef = useRef<ReturnType<typeof parseAsciiParams> | null>(null)
  if (initialRef.current === null) initialRef.current = parseAsciiParams(searchParams)
  const initial = initialRef.current

  const {
    sourceKind,
    sourceOrigin,
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
    copyText,
    downloadText,
    loadExample,
    toggleRecording,
    setColorMode,
    setBackground,
    setRenderMode,
    setCharset,
    setCustomRamp,
    setRows,
    setInvert,
    setBrightness,
    setContrast,
    setMirror,
  } = useAsciiArt(canvasRef, isFunMode ? ColorMode.color : ColorMode.grayscale, initial.options)

  // Recreate the source named in the share link, once, after mount.
  const didHydrateSource = useRef(false)
  useEffect(() => {
    if (didHydrateSource.current) return
    didHydrateSource.current = true
    if (initial.source.origin === SourceOrigin.example) loadExample()
    else if (initial.source.origin === SourceOrigin.webcam) startWebcam()
  }, [initial.source, loadExample, startWebcam])

  // Mirror a reproducible look into the URL so it's shareable; clear the params
  // for uploads (which a link can't recreate) and a bare landing. A ref guards
  // against the write feeding back into a re-render loop.
  const shareable = sourceOrigin === SourceOrigin.example || sourceOrigin === SourceOrigin.webcam
  const lastWrittenRef = useRef<string | null>(null)
  useEffect(() => {
    const next = shareable
      ? new URLSearchParams(serializeAsciiParams(options, { origin: sourceOrigin })).toString()
      : ''
    if (next === lastWrittenRef.current) return
    lastWrittenRef.current = next
    setSearchParams(next, { replace: true })
  }, [options, sourceOrigin, shareable, setSearchParams])

  const copyShareLink = useCallback(async () => {
    if (!navigator.clipboard?.writeText) return false
    try {
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch {
      return false
    }
  }, [])

  const hasSource = sourceKind !== SourceKind.none
  const canRecord =
    sourceKind === SourceKind.video &&
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'

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
        onExample={loadExample}
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
        <Controls
          options={options}
          sourceKind={sourceKind}
          isRecording={isRecording}
          canRecord={canRecord}
          onColorMode={setColorMode}
          onBackground={setBackground}
          onRenderMode={setRenderMode}
          onCharset={setCharset}
          onCustomRamp={setCustomRamp}
          onRows={setRows}
          onInvert={setInvert}
          onBrightness={setBrightness}
          onContrast={setContrast}
          onMirror={setMirror}
          onSaveImage={saveImage}
          onCopyText={copyText}
          canShareLink={shareable}
          onCopyShareLink={copyShareLink}
          onDownloadText={downloadText}
          onToggleRecording={toggleRecording}
        />
      )}

      <p className={styles.privacy}>
        Everything runs in your browser. Your photos, videos, and webcam never leave your device.
      </p>
    </div>
  )
}
