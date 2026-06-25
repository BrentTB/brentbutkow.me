import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { ColorMode, SourceKind } from './ascii-art.types'
import { AsciiOptions, BASE_CELL, MAX_COLS, MIN_COLS, defaultOptions } from './data'
import { buildAsciiGrid, gridRows } from './engine/ascii-frame'
import { renderGrid } from './renderer/render-grid'

type SourceElement = HTMLImageElement | HTMLVideoElement

export type Playback = {
  isPlaying: boolean
  currentTime: number
  duration: number
  rate: number
}

const PLAYBACK_DEFAULT: Playback = { isPlaying: false, currentTime: 0, duration: 0, rate: 1 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const sourceSize = (src: SourceElement) =>
  src instanceof HTMLVideoElement
    ? { w: src.videoWidth, h: src.videoHeight }
    : { w: src.naturalWidth, h: src.naturalHeight }

// Drives the ASCII studio: owns the offscreen sampling canvas and the source
// media (image / video / webcam), runs the render loop for moving sources,
// exposes video transport (play/pause, seek, speed), and tears everything down
// (raf, listeners, object URLs, camera tracks) on reset/unmount.
export function useAsciiArt(
  canvasRef: RefObject<HTMLCanvasElement>,
  initialColorMode: ColorMode = ColorMode.color
) {
  const [sourceKind, setSourceKind] = useState<SourceKind>(SourceKind.none)
  const [options, setOptions] = useState<AsciiOptions>(() => defaultOptions(initialColorMode))
  const [playback, setPlayback] = useState<Playback>(PLAYBACK_DEFAULT)
  const [error, setError] = useState<string | null>(null)

  // Loop reads the latest options/source without re-subscribing each change.
  const optionsRef = useRef(options)
  optionsRef.current = options
  const sourceKindRef = useRef(sourceKind)
  sourceKindRef.current = sourceKind

  const sourceRef = useRef<SourceElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const videoCleanupRef = useRef<(() => void) | null>(null)
  const sampleRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wasPlayingRef = useRef(false)
  // Lets imperative video listeners (e.g. 'seeked') redraw without re-binding.
  const renderFrameRef = useRef<() => void>(() => {})

  // Single reused <video> for both file and webcam sources; created on first use
  // with its transport listeners. Listeners are removed on unmount.
  const ensureVideo = useCallback(() => {
    if (!videoRef.current) {
      const video = document.createElement('video')
      video.playsInline = true
      video.loop = true
      const onTime = () => setPlayback((p) => ({ ...p, currentTime: video.currentTime }))
      const onMeta = () =>
        setPlayback((p) => ({
          ...p,
          duration: Number.isFinite(video.duration) ? video.duration : 0,
        }))
      const onPlay = () => setPlayback((p) => ({ ...p, isPlaying: true }))
      const onPause = () => setPlayback((p) => ({ ...p, isPlaying: false }))
      const onSeeked = () => renderFrameRef.current()
      video.addEventListener('timeupdate', onTime)
      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('durationchange', onMeta)
      video.addEventListener('play', onPlay)
      video.addEventListener('pause', onPause)
      video.addEventListener('seeked', onSeeked)
      videoCleanupRef.current = () => {
        video.removeEventListener('timeupdate', onTime)
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('durationchange', onMeta)
        video.removeEventListener('play', onPlay)
        video.removeEventListener('pause', onPause)
        video.removeEventListener('seeked', onSeeked)
      }
      videoRef.current = video
    }
    return videoRef.current
  }, [])

  const renderFrame = useCallback(() => {
    const src = sourceRef.current
    const display = canvasRef.current
    if (!src || !display) return

    const { w, h } = sourceSize(src)
    if (!w || !h) return // metadata not ready yet

    if (!sampleRef.current) sampleRef.current = document.createElement('canvas')
    const sample = sampleRef.current
    const sctx = sample.getContext('2d', { willReadFrequently: true })
    const dctx = display.getContext('2d')
    if (!sctx || !dctx) return

    const { ramp, invert, colorMode, cols: rawCols } = optionsRef.current
    const cols = clamp(Math.round(rawCols), MIN_COLS, MAX_COLS)
    const rows = gridRows(cols, w, h)
    if (rows < 1) return

    sample.width = cols
    sample.height = rows
    sctx.drawImage(src, 0, 0, cols, rows)
    const grid = buildAsciiGrid(sctx.getImageData(0, 0, cols, rows).data, cols, rows, {
      ramp,
      invert,
    })

    display.width = cols * BASE_CELL
    display.height = rows * BASE_CELL * 2
    renderGrid(dctx, grid, colorMode)
  }, [canvasRef])
  renderFrameRef.current = renderFrame

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return
    const tick = () => {
      renderFrame()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [renderFrame])

  const teardownSource = useCallback(() => {
    stopLoop()
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
    }
    sourceRef.current = null
  }, [stopLoop])

  const loadImage = useCallback(
    (file: File) => {
      teardownSource()
      setError(null)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      const img = new Image()
      img.onload = () => {
        sourceRef.current = img
        setSourceKind(SourceKind.image)
        renderFrame()
      }
      img.onerror = () => setError('Could not load that image.')
      img.src = url
    },
    [teardownSource, renderFrame]
  )

  const loadVideo = useCallback(
    (file: File) => {
      teardownSource()
      setError(null)
      setPlayback(PLAYBACK_DEFAULT)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      const video = ensureVideo()
      video.muted = false
      video.playbackRate = 1
      video.src = url
      video
        .play()
        .then(() => {
          sourceRef.current = video
          setSourceKind(SourceKind.video)
          startLoop()
        })
        .catch(() => setError('Could not play that video.'))
    },
    [teardownSource, ensureVideo, startLoop]
  )

  const startWebcam = useCallback(async () => {
    teardownSource()
    setError(null)
    setPlayback(PLAYBACK_DEFAULT)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support camera access.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      const video = ensureVideo()
      video.muted = true
      video.srcObject = stream
      await video.play()
      sourceRef.current = video
      setSourceKind(SourceKind.webcam)
      startLoop()
    } catch {
      setError('Camera access was blocked.')
    }
  }, [teardownSource, ensureVideo, startLoop])

  const reset = useCallback(() => {
    teardownSource()
    setError(null)
    setPlayback(PLAYBACK_DEFAULT)
    setSourceKind(SourceKind.none)
    const display = canvasRef.current
    const dctx = display?.getContext('2d')
    if (display && dctx) dctx.clearRect(0, 0, display.width, display.height)
  }, [teardownSource, canvasRef])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video
        .play()
        .then(() => startLoop())
        .catch(() => {})
    } else {
      video.pause()
      stopLoop()
    }
  }, [startLoop, stopLoop])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    setPlayback((p) => ({ ...p, currentTime: time }))
  }, [])

  const setRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (video) video.playbackRate = rate
    setPlayback((p) => ({ ...p, rate }))
  }, [])

  const setColorMode = useCallback(
    (colorMode: ColorMode) => setOptions((o) => ({ ...o, colorMode })),
    []
  )
  const setRamp = useCallback((ramp: string) => setOptions((o) => ({ ...o, ramp })), [])
  const setCols = useCallback((cols: number) => setOptions((o) => ({ ...o, cols })), [])
  const setInvert = useCallback((invert: boolean) => setOptions((o) => ({ ...o, invert })), [])

  // A still image doesn't loop, so re-render it when an option changes.
  useEffect(() => {
    if (sourceKind === SourceKind.image) renderFrame()
  }, [options, sourceKind, renderFrame])

  // Pause the loop (and audio) while the tab is hidden; resume only what was
  // playing, so a user-paused video stays paused on return.
  useEffect(() => {
    const onVisibility = () => {
      const moving =
        sourceKindRef.current === SourceKind.video || sourceKindRef.current === SourceKind.webcam
      if (!moving) return
      const video = videoRef.current
      if (document.hidden) {
        wasPlayingRef.current = !!video && !video.paused
        stopLoop()
        video?.pause()
      } else if (wasPlayingRef.current) {
        video?.play().catch(() => {})
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [startLoop, stopLoop])

  useEffect(
    () => () => {
      teardownSource()
      videoCleanupRef.current?.()
    },
    [teardownSource]
  )

  return {
    sourceKind,
    options,
    playback,
    error,
    loadImage,
    loadVideo,
    startWebcam,
    reset,
    togglePlay,
    seek,
    setRate,
    setColorMode,
    setRamp,
    setCols,
    setInvert,
  }
}
