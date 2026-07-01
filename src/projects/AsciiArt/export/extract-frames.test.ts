import { describe, it, expect, vi } from 'vitest'
import { extractAsciiFrames, FrameSource } from './extract-frames'
import { defaultOptions } from '../data'
import { ColorMode } from '../ascii-art.types'
import { gridCols } from '../engine/ascii-frame'

const mockCtx = () =>
  ({
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(0, w * h * 4)),
    }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  }) as unknown as CanvasRenderingContext2D

const fakeVideo = (over: Partial<FrameSource> = {}) =>
  ({ duration: 1, videoWidth: 320, videoHeight: 240, ...over }) as FrameSource & CanvasImageSource

const options = defaultOptions(ColorMode.grayscale) // rows = 64

describe('extractAsciiFrames', () => {
  it('samples one frame per timeline step and caps rows', async () => {
    const seek = vi.fn(() => Promise.resolve())
    const result = await extractAsciiFrames(
      fakeVideo(),
      document.createElement('canvas'),
      mockCtx(),
      options,
      {
        fps: 10,
        maxFrames: 100,
        maxRows: 40,
        seek,
      }
    )
    // 1s at 10fps, step 0.1 -> t = 0, 0.1, ... 0.9
    expect(result.frames).toHaveLength(10)
    expect(seek).toHaveBeenCalledTimes(10)
    expect(result.rows).toBe(40) // capped below the option's 64
    expect(result.cols).toBe(gridCols(40, 320, 240))
    expect(result.fps).toBe(10) // 10 frames / 1s
    result.frames.forEach((f) => expect(typeof f).toBe('string'))
  })

  it('widens the step and lowers the playback rate so a long clip stays under maxFrames', async () => {
    const result = await extractAsciiFrames(
      fakeVideo({ duration: 10 }),
      document.createElement('canvas'),
      mockCtx(),
      options,
      { fps: 10, maxFrames: 20, maxRows: 40, seek: () => Promise.resolve() }
    )
    // 10s at 10fps would be 100 frames; the cap widens step to 0.5 -> 20 frames
    expect(result.frames).toHaveLength(20)
    // playback fps drops to 20/10s = 2 so the PDF runs at real time, not 3x fast
    expect(result.fps).toBe(2)
  })

  it('reports progress up to but not past 0.99', async () => {
    const onProgress = vi.fn()
    await extractAsciiFrames(fakeVideo(), document.createElement('canvas'), mockCtx(), options, {
      fps: 10,
      maxFrames: 100,
      maxRows: 40,
      seek: () => Promise.resolve(),
      onProgress,
    })
    const values = onProgress.mock.calls.map((c) => c[0])
    expect(Math.max(...values)).toBeLessThanOrEqual(0.99)
    expect(values.length).toBeGreaterThan(0)
  })

  it('returns nothing when the duration is unknown', async () => {
    const seek = vi.fn(() => Promise.resolve())
    const result = await extractAsciiFrames(
      fakeVideo({ duration: NaN }),
      document.createElement('canvas'),
      mockCtx(),
      options,
      { fps: 10, maxFrames: 100, maxRows: 40, seek }
    )
    expect(result.frames).toHaveLength(0)
    expect(seek).not.toHaveBeenCalled()
  })
})
