import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useAsciiArt } from './useAsciiArt'
import { ColorMode } from './ascii-art.types'
import { Charset, DEFAULT_COLS } from './data'

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
    expect(result.current.options.cols).toBe(DEFAULT_COLS)
    expect(result.current.options.ramp).toBe(Charset.classic)
  })

  it('honors the initial color mode', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef, ColorMode.grayscale))
    expect(result.current.options.colorMode).toBe(ColorMode.grayscale)
  })

  it('updates options through the setters', () => {
    const { result } = renderHook(() => useAsciiArt(canvasRef))
    act(() => result.current.setColorMode(ColorMode.grayscale))
    act(() => result.current.setCols(150))
    act(() => result.current.setInvert(true))
    act(() => result.current.setRamp(Charset.blocks))
    expect(result.current.options).toMatchObject({
      colorMode: ColorMode.grayscale,
      cols: 150,
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
})
