import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  AsciiGrid,
  BackgroundMode,
  ColorMode,
  RenderMode,
  SourceKind,
  SourceOrigin,
} from './ascii-art.types'
import {
  AsciiOptions,
  CANVAS_PAD,
  CUSTOM_CHARSET,
  Charset,
  CharsetSelection,
  DEFAULT_CHARSET,
  defaultOptions,
} from './data'
import { gridToText } from './engine/ascii-frame'
import { buildGridFromSource } from './engine/sample-grid'
import { extractAsciiFrames, ExtractedFrames } from './export/extract-frames'
import { buildAsciiPdf, isRampPdfSafe } from './export/ascii-pdf'
import { estimateAsciiPdf, Estimate, PDF_MAX_FRAMES } from './export/pdf-estimate'
import { renderGrid } from './renderer/render-grid'
import { drawSampleScene } from './sample-image'
import { downloadBlob } from '../../components/utils/download'

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

// PDF export defaults; the user picks fps and length in the export dialog. The
// frame ceiling (PDF_MAX_FRAMES) lives in pdf-estimate; rows are capped here for
// readable glyphs.
const PDF_FPS = 12
const PDF_MAX_ROWS = 40

// Seeks a video and resolves once the frame is decoded, so the export loop can
// sample a stable frame at each position.
const seekVideo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('seek failed'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    try {
      video.currentTime = time
    } catch {
      cleanup()
      reject(new Error('seek failed'))
    }
  })

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
  initialColorMode: ColorMode = ColorMode.color,
  initialOptions?: Partial<AsciiOptions>
) {
  const [sourceKind, setSourceKind] = useState<SourceKind>(SourceKind.none)
  const [options, setOptions] = useState<AsciiOptions>(() => ({
    ...defaultOptions(initialColorMode),
    ...initialOptions,
  }))
  const [playback, setPlayback] = useState<Playback>(PLAYBACK_DEFAULT)
  const [isRecording, setIsRecording] = useState(false)
  // 0..1 while a PDF export runs, null when idle — drives the button's progress.
  const [pdfProgress, setPdfProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Where the source came from — gates whether the look is shareable (an upload
  // can't be recreated from a link; the example and webcam can).
  const [sourceOrigin, setSourceOrigin] = useState<SourceOrigin>(SourceOrigin.none)

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
  const lastGridRef = useRef<AsciiGrid | null>(null)
  const wasPlayingRef = useRef(false)
  const recoverAttemptsRef = useRef(0)
  // True while PDF export drives its own seeks, so the decode-error recovery
  // (which reloads the blob) doesn't fight the extraction loop.
  const exportingRef = useRef(false)
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
      const onTime = () => {
        if (exportingRef.current) return // export scrubs the clip; keep the bar still
        setPlayback((p) => ({ ...p, currentTime: video.currentTime }))
      }
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
        if (exportingRef.current) return // export owns the seeks; skip blob recovery
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
    // While exporting, the clip is scrubbed off-screen; don't paint those frames.
    if (exportingRef.current) return
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

    const opts = optionsRef.current
    // Mirror the webcam (selfie view) by flipping the sample horizontally.
    const flip = opts.mirror && sourceKindRef.current === SourceKind.webcam
    try {
      const grid = buildGridFromSource(sample, sctx, src, w, h, opts, flip)
      if (!grid) return
      lastGridRef.current = grid // kept for text copy/download

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
      // Only resize when needed — reassigning width/height clears the canvas and
      // would disrupt an in-progress recording capture.
      const nextW = Math.round(canvasW)
      const nextH = Math.round(canvasH)
      if (display.width !== nextW) display.width = nextW
      if (display.height !== nextH) display.height = nextH
      renderGrid(dctx, grid, opts.colorMode, opts.background)
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
    setSourceOrigin(SourceOrigin.none)
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
    lastGridRef.current = null // drop the cached frame so text export can't emit a stale grid
  }, [stopLoop])

  const loadImage = useCallback(
    (file: File) => {
      teardownSource()
      setError(null)
      setPlayback(PLAYBACK_DEFAULT) // a still has no transport; clears stale isPlaying
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      const img = new Image()
      img.onload = () => {
        sourceRef.current = img
        setSourceKind(SourceKind.image)
        setSourceOrigin(SourceOrigin.upload)
        renderFrame()
      }
      img.onerror = () => setError('Could not load that image.')
      img.src = url
    },
    [teardownSource, renderFrame]
  )

  // Loads a built-in demo scene so the page works without an upload.
  const loadExample = useCallback(() => {
    teardownSource()
    setError(null)
    setPlayback(PLAYBACK_DEFAULT) // a still has no transport; clears stale isPlaying
    const img = new Image()
    img.onload = () => {
      sourceRef.current = img
      setSourceKind(SourceKind.image)
      setSourceOrigin(SourceOrigin.example)
      renderFrame()
    }
    img.onerror = () => setError('Could not load the example.')
    img.src = drawSampleScene()
  }, [teardownSource, renderFrame])

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
          setSourceOrigin(SourceOrigin.upload)
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
      setSourceOrigin(SourceOrigin.webcam)
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

  // Copies the current ASCII frame as plain text to the clipboard.
  const copyText = useCallback(async () => {
    const grid = lastGridRef.current
    if (!grid || !navigator.clipboard?.writeText) return false
    try {
      await navigator.clipboard.writeText(gridToText(grid))
      return true
    } catch {
      return false
    }
  }, [])

  // Downloads the current ASCII frame as a .txt file.
  const downloadText = useCallback(() => {
    const grid = lastGridRef.current
    if (!grid) return
    downloadBlob(new Blob([gridToText(grid)], { type: 'text/plain' }), 'ascii-art.txt')
  }, [])

  // Renders the whole video to a self-playing ASCII PDF. Seeks through the clip
  // off-screen, sampling each frame to text, then packs them into a PDF whose
  // built-in JS animates them. Pauses the live loop during extraction and
  // restores the prior position/playback afterwards.
  const exportPdf = useCallback(
    async (fps: number = PDF_FPS, durationSec?: number) => {
      const video = videoRef.current
      if (!video || sourceRef.current !== video) return
      if (!Number.isFinite(video.duration) || video.duration <= 0) return
      if (!sampleRef.current) sampleRef.current = document.createElement('canvas')
      const sctx = sampleRef.current.getContext('2d', { willReadFrequently: true })
      if (!sctx) return

      const wasPlaying = !video.paused
      const resumeAt = video.currentTime
      exportingRef.current = true
      video.pause()
      stopLoop()
      setError(null)
      setPdfProgress(0)

      // The PDF font only draws ASCII/Latin-1; fall back to the classic ramp when
      // the chosen glyphs (e.g. block shades) wouldn't render.
      const active = optionsRef.current
      const activeRamp =
        active.charset === CUSTOM_CHARSET ? active.customRamp : Charset[active.charset]
      const exportOptions = isRampPdfSafe(activeRamp)
        ? active
        : { ...active, charset: DEFAULT_CHARSET }

      let extracted: ExtractedFrames = { frames: [], cols: 0, rows: 0, fps: 0 }
      try {
        extracted = await extractAsciiFrames(video, sampleRef.current, sctx, exportOptions, {
          fps,
          maxFrames: PDF_MAX_FRAMES,
          maxRows: PDF_MAX_ROWS,
          duration: durationSec,
          seek: (time) => seekVideo(video, time),
          onProgress: setPdfProgress,
        })
      } catch {
        setError("Couldn't read this video for the PDF.")
      }

      exportingRef.current = false
      setPdfProgress(null)

      if (extracted.frames.length) {
        const pdf = buildAsciiPdf(extracted.frames, {
          cols: extracted.cols,
          rows: extracted.rows,
          fps: extracted.fps,
        })
        downloadBlob(pdf, 'ascii-art.pdf')
      }

      // Export scrubbed the clip; restore the viewer's position and playback.
      try {
        video.currentTime = resumeAt
      } catch {
        // position may not be seekable yet; ignore
      }
      if (wasPlaying) {
        video
          .play()
          .then(() => startLoop())
          .catch(() => {})
      } else {
        renderFrame()
      }
    },
    [stopLoop, startLoop, renderFrame]
  )

  // Predicts frames/size/time for a PDF export at the given rate and length, so
  // the dialog can show live figures. Null until the video has a known size.
  const estimatePdf = useCallback((fps: number, durationSec: number): Estimate | null => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return null
    return estimateAsciiPdf({
      srcWidth: video.videoWidth,
      srcHeight: video.videoHeight,
      rows: Math.min(optionsRef.current.rows, PDF_MAX_ROWS),
      fps,
      duration: durationSec,
      maxFrames: PDF_MAX_FRAMES,
    })
  }, [])

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
  const setRenderMode = useCallback(
    (renderMode: RenderMode) => setOptions((o) => ({ ...o, renderMode })),
    []
  )
  const setCharset = useCallback(
    (charset: CharsetSelection) =>
      setOptions((o) => {
        // Entering custom from a preset: seed the ramp with that preset so the
        // output doesn't change and the user can see/edit what they were using.
        if (charset === CUSTOM_CHARSET && o.charset !== CUSTOM_CHARSET) {
          return { ...o, charset, customRamp: Charset[o.charset] }
        }
        return { ...o, charset }
      }),
    []
  )
  const setCustomRamp = useCallback(
    (customRamp: string) => setOptions((o) => ({ ...o, customRamp })),
    []
  )
  const setRows = useCallback((rows: number) => setOptions((o) => ({ ...o, rows })), [])
  const setInvert = useCallback((invert: boolean) => setOptions((o) => ({ ...o, invert })), [])
  const setBrightness = useCallback(
    (brightness: number) => setOptions((o) => ({ ...o, brightness })),
    []
  )
  const setContrast = useCallback((contrast: number) => setOptions((o) => ({ ...o, contrast })), [])
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

  // Pause the loop, audio, and any recording while the tab is hidden; resume only
  // what was playing, so a user-paused video stays paused on return. Pausing the
  // recorder keeps the frozen-canvas span out of the saved clip.
  useEffect(() => {
    const onVisibility = () => {
      const moving =
        sourceKindRef.current === SourceKind.video || sourceKindRef.current === SourceKind.webcam
      if (!moving) return
      const video = videoRef.current
      const recorder = recorderRef.current
      if (document.hidden) {
        wasPlayingRef.current = !!video && !video.paused
        if (recorder?.state === 'recording') recorder.pause()
        stopLoop()
        video?.pause()
      } else {
        if (recorder?.state === 'paused') recorder.resume()
        if (wasPlayingRef.current) {
          video?.play().catch(() => {})
          startLoop()
        }
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
    sourceOrigin,
    options,
    playback,
    isRecording,
    pdfProgress,
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
    exportPdf,
    estimatePdf,
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
  }
}
