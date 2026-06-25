import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { BackgroundMode, ColorMode, SourceKind } from './ascii-art.types'
import {
  AsciiOptions,
  CANVAS_PAD,
  MAX_COLS,
  MAX_ROWS,
  MIN_COLS,
  MIN_ROWS,
  defaultOptions,
} from './data'
import { buildAsciiGrid, gridCols, shouldInvertBrightness } from './engine/ascii-frame'
import { renderGrid } from './renderer/render-grid'
import { downloadBlob } from './download'

type SourceElement = HTMLImageElement | HTMLVideoElement

// captureStream is prefixed in Firefox; type both without leaking `any`.
type CaptureableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream
  mozCaptureStream?: () => MediaStream
}

// WebM codec preferences for MediaRecorder, best first.
const RECORD_MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']

const pickRecordMimeType = (): string =>
  typeof MediaRecorder === 'undefined'
    ? ''
    : (RECORD_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '')

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
  const [isRecording, setIsRecording] = useState(false)
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
  const recorderRef = useRef<MediaRecorder | null>(null)
  const wasPlayingRef = useRef(false)
  const recoverAttemptsRef = useRef(0)
  // Fixed stage box size, kept fresh by a ResizeObserver so the loop doesn't
  // force a layout reflow reading clientWidth every frame.
  const boxSizeRef = useRef({ w: 640, h: 480 })
  // Let imperative video listeners reach the latest loop/draw without re-binding.
  const renderFrameRef = useRef<() => void>(() => {})
  const stopLoopRef = useRef<() => void>(() => {})
  const startLoopRef = useRef<() => void>(() => {})

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
      const onSeeked = () => {
        recoverAttemptsRef.current = 0 // a clean seek clears the failure streak
        renderFrameRef.current()
      }
      // Some browsers (notably Firefox's GMP decoder) throw a fatal decode error
      // when a seek lands on a frame they can't re-init. Reload the blob and
      // restore the position so a transient fault doesn't kill playback.
      const onError = () => {
        if (sourceKindRef.current !== SourceKind.video || !objectUrlRef.current) return
        if (recoverAttemptsRef.current >= 3) {
          stopLoopRef.current()
          setError("This video couldn't be decoded. Try another file or browser.")
          return
        }
        recoverAttemptsRef.current += 1
        const resumeAt = video.currentTime || 0
        const wasPlaying = !video.paused
        const onReady = () => {
          video.removeEventListener('loadeddata', onReady)
          try {
            video.currentTime = resumeAt
          } catch {
            // position may not be seekable yet on a fresh load; ignore
          }
          if (wasPlaying) {
            video
              .play()
              .then(() => startLoopRef.current())
              .catch(() => {})
          } else {
            renderFrameRef.current()
          }
        }
        video.addEventListener('loadeddata', onReady)
        video.src = objectUrlRef.current
        video.load()
      }
      video.addEventListener('timeupdate', onTime)
      video.addEventListener('loadedmetadata', onMeta)
      video.addEventListener('durationchange', onMeta)
      video.addEventListener('play', onPlay)
      video.addEventListener('pause', onPause)
      video.addEventListener('seeked', onSeeked)
      video.addEventListener('error', onError)
      videoCleanupRef.current = () => {
        video.removeEventListener('timeupdate', onTime)
        video.removeEventListener('loadedmetadata', onMeta)
        video.removeEventListener('durationchange', onMeta)
        video.removeEventListener('play', onPlay)
        video.removeEventListener('pause', onPause)
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('error', onError)
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

    const { ramp, invert, colorMode, background, mirror, rows: rawRows } = optionsRef.current
    const rows = clamp(Math.round(rawRows), MIN_ROWS, MAX_ROWS)
    const cols = clamp(gridCols(rows, w, h), MIN_COLS, MAX_COLS)
    if (cols < 1 || rows < 1) return

    // Fit the canvas inside its fixed stage box, preserving the source aspect, so
    // the on-screen size stays constant and glyphs scale with the row count.
    const availW = Math.max(1, boxSizeRef.current.w - CANVAS_PAD * 2)
    const availH = Math.max(1, boxSizeRef.current.h - CANVAS_PAD * 2)
    const srcAspect = w / h
    let canvasW = availW
    let canvasH = availW / srcAspect
    if (canvasH > availH) {
      canvasH = availH
      canvasW = availH * srcAspect
    }

    sample.width = cols
    sample.height = rows
    try {
      // Mirror the webcam (selfie view) by flipping the sample horizontally.
      const flip = mirror && sourceKindRef.current === SourceKind.webcam
      if (flip) {
        sctx.save()
        sctx.translate(cols, 0)
        sctx.scale(-1, 1)
      }
      sctx.drawImage(src, 0, 0, cols, rows)
      if (flip) sctx.restore()
      const grid = buildAsciiGrid(sctx.getImageData(0, 0, cols, rows).data, cols, rows, {
        ramp,
        invert: shouldInvertBrightness(background, invert),
        invertColor: invert,
      })
      // Only resize when needed — reassigning width/height clears the canvas and
      // would disrupt an in-progress recording capture.
      const nextW = Math.round(canvasW)
      const nextH = Math.round(canvasH)
      if (display.width !== nextW) display.width = nextW
      if (display.height !== nextH) display.height = nextH
      renderGrid(dctx, grid, colorMode, background)
    } catch {
      // Source isn't drawable this frame (mid-seek or reloading); skip it.
    }
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
  stopLoopRef.current = stopLoop
  startLoopRef.current = startLoop

  const teardownSource = useCallback(() => {
    stopLoop()
    // Abort any recording without downloading a partial clip.
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      try {
        recorder.stop()
      } catch {
        // already stopping; ignore
      }
    }
    recorderRef.current = null
    setIsRecording(false)
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
      recoverAttemptsRef.current = 0
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

  // Saves the current ASCII frame as a PNG — works for any source (a snapshot of
  // the live video/webcam frame, or the still image).
  const saveImage = useCallback(() => {
    const display = canvasRef.current
    if (!display) return
    display.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'ascii-art.png')
    }, 'image/png')
  }, [canvasRef])

  // Records the ASCII canvas plus the video's audio to a .webm in real time, via
  // the built-in MediaRecorder (no dependency).
  const startRecording = useCallback(() => {
    const display = canvasRef.current
    const video = videoRef.current
    if (!display || !video) return
    if (typeof MediaRecorder === 'undefined' || typeof display.captureStream !== 'function') {
      setError("Recording isn't supported in this browser.")
      return
    }
    let recorder: MediaRecorder
    try {
      const canvasStream = display.captureStream(30)
      const tracks: MediaStreamTrack[] = canvasStream.getVideoTracks()
      const capture =
        (video as CaptureableVideo).captureStream ?? (video as CaptureableVideo).mozCaptureStream
      const audioTrack = capture?.call(video).getAudioTracks()[0]
      if (audioTrack) tracks.push(audioTrack)
      const mimeType = pickRecordMimeType()
      recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : undefined)
    } catch {
      setError("Recording isn't supported in this browser.")
      return
    }
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = () => {
      downloadBlob(
        new Blob(chunks, { type: recorder.mimeType || 'video/webm' }),
        'ascii-video.webm'
      )
      setIsRecording(false)
    }
    recorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }, [canvasRef])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
  }, [])

  const toggleRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') stopRecording()
    else startRecording()
  }, [startRecording, stopRecording])

  const setColorMode = useCallback(
    (colorMode: ColorMode) => setOptions((o) => ({ ...o, colorMode })),
    []
  )
  const setBackground = useCallback(
    (background: BackgroundMode) => setOptions((o) => ({ ...o, background })),
    []
  )
  const setRamp = useCallback((ramp: string) => setOptions((o) => ({ ...o, ramp })), [])
  const setRows = useCallback((rows: number) => setOptions((o) => ({ ...o, rows })), [])
  const setInvert = useCallback((invert: boolean) => setOptions((o) => ({ ...o, invert })), [])
  const setMirror = useCallback((mirror: boolean) => setOptions((o) => ({ ...o, mirror })), [])

  // Track the stage box so the canvas keeps a constant on-screen size; redraw on
  // resize (covers still images and paused video — the loop handles live frames).
  useEffect(() => {
    const box = canvasRef.current?.parentElement
    if (!box) return
    const measure = () => {
      boxSizeRef.current = { w: box.clientWidth, h: box.clientHeight }
      renderFrameRef.current()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [canvasRef, sourceKind])

  // When the loop isn't driving frames (a still image, or paused video/webcam),
  // re-render on option changes so resolution etc. update live — not just on resume.
  useEffect(() => {
    if (sourceKind !== SourceKind.none && !playback.isPlaying) renderFrame()
  }, [options, sourceKind, playback.isPlaying, renderFrame])

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

  // Spacebar toggles video playback, unless focus is on a control (so it doesn't
  // hijack buttons, sliders, or text fields).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      if (sourceKindRef.current !== SourceKind.video) return
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        el?.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay])

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
  }
}
