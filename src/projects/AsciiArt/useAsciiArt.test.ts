import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useAsciiArt } from './useAsciiArt'
import { ColorMode } from './ascii-art.types'
import { Charset, DEFAULT_ROWS } from './data'

const canvasRef = { current: document.createElement('canvas') }

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
    expect(result.current.options.ramp).toBe(Charset.classic)
  })

  it('honors the initial color mode', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef, ColorMode.grayscale))
    expect(result.current.options.colorMode).toBe(ColorMode.grayscale)
  })

  it('updates options through the setters', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.setColorMode(ColorMode.grayscale))
    act(() => result.current.setRows(90))
    act(() => result.current.setInvert(true))
    act(() => result.current.setRamp(Charset.blocks))
    expect(result.current.options).toMatchObject({
      colorMode: ColorMode.grayscale,
      rows: 90,
      invert: true,
      ramp: Charset.blocks,
    })
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

  // Guards the fatal decode error (e.g. Firefox GMP failing on a seek) that used
  // to silently kill playback: a video 'error' must reload the blob to recover.
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
})
