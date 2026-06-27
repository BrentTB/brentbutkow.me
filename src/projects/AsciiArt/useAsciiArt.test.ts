import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useAsciiArt } from './useAsciiArt'
import { BackgroundMode, ColorMode } from './ascii-art.types'
import { Charset, DEFAULT_CHARSET, DEFAULT_ROWS } from './data'

const canvasRef = { current: document.createElement('canvas') }

// Drives one video frame through fake 2D contexts so lastGridRef holds a grid —
// the precondition for text copy/download. Returns the rendered hook result.
async function renderOneVideoFrame() {
  let video: HTMLVideoElement | undefined
  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreate(tag)
    if (tag === 'video') video = el as HTMLVideoElement
    return el
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(Math.max(0, w * h * 4)),
        }),
      }) as unknown as CanvasRenderingContext2D
  )

  const { result } = renderHook(() => useAsciiArt(canvasRef))
  act(() => result.current.loadVideo(new File(['x'], 'clip.mp4', { type: 'video/mp4' })))
  await act(async () => {}) // sourceKind -> video, paused in jsdom
  Object.defineProperty(video, 'videoWidth', { value: 320, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: 240, configurable: true })
  act(() => result.current.setRows(90)) // option change repaints the paused frame
  return result
}

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  // jsdom leaves these unimplemented — make them inert so the hook can drive media.
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
  HTMLMediaElement.prototype.load = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useAsciiArt', () => {
  it('starts with no source and the default options', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    expect(result.current.sourceKind).toBe('none')
    expect(result.current.options.rows).toBe(DEFAULT_ROWS)
    expect(result.current.options.charset).toBe(DEFAULT_CHARSET)
  })

  it('honors the initial color mode', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef, ColorMode.grayscale))
    expect(result.current.options.colorMode).toBe(ColorMode.grayscale)
  })

  it('updates options through the setters', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.setColorMode(ColorMode.grayscale))
    act(() => result.current.setBackground(BackgroundMode.light))
    act(() => result.current.setRenderMode('edges'))
    act(() => result.current.setRows(90))
    act(() => result.current.setInvert(true))
    act(() => result.current.setCharset('blocks'))
    act(() => result.current.setCustomRamp('AB '))
    act(() => result.current.setBrightness(20))
    act(() => result.current.setContrast(1.5))
    act(() => result.current.setMirror(false))
    expect(result.current.options).toMatchObject({
      colorMode: ColorMode.grayscale,
      background: BackgroundMode.light,
      renderMode: 'edges',
      rows: 90,
      invert: true,
      charset: 'blocks',
      customRamp: 'AB ',
      brightness: 20,
      contrast: 1.5,
      mirror: false,
    })
  })

  it('seeds the custom ramp from the active preset when switching to custom', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.setCharset('blocks'))
    act(() => result.current.setCharset('custom'))
    expect(result.current.options.charset).toBe('custom')
    expect(result.current.options.customRamp).toBe(Charset.blocks)
  })

  it('surfaces an error when the video fails to play', async () => {
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.reject(new Error('decode')))
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    await act(async () => {
      result.current.loadVideo(new File(['x'], 'clip.webm', { type: 'video/webm' }))
      await new Promise((resolve) => setTimeout(resolve))
    })
    expect(result.current.error).toBe('Could not play that video.')
    expect(result.current.sourceKind).toBe('none')
  })

  it('stops the camera tracks on unmount', async () => {
    const stop = vi.fn()
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    })

    const { result, unmount } = renderHook(() => useAsciiArt(canvasRef))
    await act(async () => {
      await result.current.startWebcam()
    })
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    expect(result.current.sourceKind).toBe('webcam')

    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it('revokes the object URL when the source is reset', async () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    act(() => result.current.loadVideo(file))
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)

    await act(async () => {}) // flush the play() promise
    act(() => result.current.reset())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(result.current.sourceKind).toBe('none')
  })

  it('starts with default playback and updates the rate', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    expect(result.current.playback).toMatchObject({ isPlaying: false, rate: 1 })
    act(() => result.current.setRate(1.5))
    expect(result.current.playback.rate).toBe(1.5)
  })

  // Guards recovery from a fatal decode error (e.g. Firefox GMP failing on a seek):
  // a video 'error' must reload the blob rather than silently kill playback.
  it('reloads the video to recover from a decode error', async () => {
    let video: HTMLVideoElement | undefined
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'video') video = el as HTMLVideoElement
      return el
    })

    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.loadVideo(new File(['x'], 'clip.mp4', { type: 'video/mp4' })))
    await act(async () => {}) // sourceKind -> video
    expect(result.current.sourceKind).toBe('video')

    const loadMock = HTMLMediaElement.prototype.load as ReturnType<typeof vi.fn>
    const before = loadMock.mock.calls.length
    act(() => video?.dispatchEvent(new Event('error')))
    expect(loadMock.mock.calls.length).toBeGreaterThan(before)
  })

  // Guards the paused-video redraw: changing resolution while paused must repaint
  // the canvas, not wait for the user to press play.
  it('re-renders a paused video when an option changes', async () => {
    let video: HTMLVideoElement | undefined
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'video') video = el as HTMLVideoElement
      return el
    })
    // Fake 2D contexts so renderFrame's draw calls are observable in jsdom.
    const ctxByCanvas = new WeakMap<HTMLCanvasElement, Record<string, ReturnType<typeof vi.fn>>>()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement
    ) {
      let ctx = ctxByCanvas.get(this)
      if (!ctx) {
        ctx = {
          canvas: this as unknown as ReturnType<typeof vi.fn>,
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(Math.max(0, w * h * 4)),
          })),
        }
        ctxByCanvas.set(this, ctx)
      }
      return ctx as unknown as CanvasRenderingContext2D
    })

    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.loadVideo(new File(['x'], 'clip.mp4', { type: 'video/mp4' })))
    await act(async () => {}) // sourceKind -> video, paused (no 'play' event in jsdom)
    // jsdom videos report 0x0; give it real dimensions so renderFrame proceeds.
    Object.defineProperty(video, 'videoWidth', { value: 320, configurable: true })
    Object.defineProperty(video, 'videoHeight', { value: 240, configurable: true })

    // Changing resolution on the paused video must repaint the canvas (fillRect
    // runs once per render). Without the fix, no render happens until resume.
    act(() => result.current.setRows(90))
    expect(ctxByCanvas.get(canvasRef.current)?.fillRect).toHaveBeenCalled()
  })

  // Guards the stale-isPlaying bug: switching from a playing source to a still
  // image must reset playback, or the image stops responding to option changes.
  it('resets playback when an example loads over a playing source', async () => {
    let video: HTMLVideoElement | undefined
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'video') video = el as HTMLVideoElement
      return el
    })
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    })

    const { result } = renderHook(() => useAsciiArt(canvasRef))
    await act(async () => {
      await result.current.startWebcam()
    })
    act(() => video?.dispatchEvent(new Event('play')))
    expect(result.current.playback.isPlaying).toBe(true)

    act(() => result.current.loadExample())
    expect(result.current.playback.isPlaying).toBe(false)
  })

  it('toggles video playback on spacebar', async () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.loadVideo(new File(['x'], 'clip.mp4', { type: 'video/mp4' })))
    await act(async () => {}) // sourceKind -> video, paused in jsdom
    expect(result.current.sourceKind).toBe('video')

    const playMock = HTMLMediaElement.prototype.play as ReturnType<typeof vi.fn>
    const before = playMock.mock.calls.length
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })))
    expect(playMock.mock.calls.length).toBeGreaterThan(before)
  })

  it('saves the current frame as a PNG download', () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) =>
      cb(new Blob(['x'], { type: 'image/png' }))
    )
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.saveImage())
    expect(clickSpy).toHaveBeenCalled()
  })

  it('returns false from copyText when nothing has rendered yet', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.copyText()
    })
    expect(ok).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies the rendered frame as text, reporting clipboard success and failure', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const result = await renderOneVideoFrame()

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.copyText()
    })
    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith(expect.any(String))

    writeText.mockImplementation(() => Promise.reject(new Error('denied')))
    await act(async () => {
      ok = await result.current.copyText()
    })
    expect(ok).toBe(false)
  })

  it('downloads the rendered frame as a text file', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const result = await renderOneVideoFrame()
    act(() => result.current.downloadText())
    expect(clickSpy).toHaveBeenCalled()
  })

  it('records to a webm download and toggles the recording flag', async () => {
    class FakeRecorder {
      state = 'inactive'
      mimeType = 'video/webm'
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
        this.onstop?.()
      }
      static isTypeSupported() {
        return true
      }
    }
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    vi.stubGlobal(
      'MediaStream',
      class {
        constructor(public tracks: unknown[] = []) {}
      }
    )
    ;(
      HTMLCanvasElement.prototype as unknown as { captureStream: () => MediaStream }
    ).captureStream = vi.fn(() => ({ getVideoTracks: () => [{}] }) as unknown as MediaStream)
    ;(HTMLMediaElement.prototype as unknown as { captureStream: () => MediaStream }).captureStream =
      vi.fn(() => ({ getAudioTracks: () => [{}] }) as unknown as MediaStream)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.loadVideo(new File(['x'], 'clip.mp4', { type: 'video/mp4' })))
    await act(async () => {})

    act(() => result.current.toggleRecording())
    expect(result.current.isRecording).toBe(true)
    act(() => result.current.toggleRecording())
    expect(result.current.isRecording).toBe(false)
    expect(clickSpy).toHaveBeenCalled() // downloaded on stop
  })
})
