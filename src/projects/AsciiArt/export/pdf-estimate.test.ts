import { describe, it, expect } from 'vitest'
import { estimateAsciiPdf } from './pdf-estimate'
import { gridCols } from '../engine/ascii-frame'

describe('estimateAsciiPdf', () => {
  const base = { srcWidth: 320, srcHeight: 240, rows: 40, maxFrames: 600 }

  it('derives cols from the source aspect and frames from fps x duration', () => {
    const e = estimateAsciiPdf({ ...base, fps: 12, duration: 5 })
    expect(e.cols).toBe(gridCols(40, 320, 240))
    expect(e.rows).toBe(40)
    expect(e.frames).toBe(60) // 12 * 5
    expect(e.capped).toBe(false)
  })

  it('grows the file estimate with frame count', () => {
    const short = estimateAsciiPdf({ ...base, fps: 12, duration: 2 })
    const long = estimateAsciiPdf({ ...base, fps: 12, duration: 10 })
    expect(long.bytes).toBeGreaterThan(short.bytes)
    expect(long.encodeMs).toBeGreaterThan(short.encodeMs)
  })

  it('flags and clamps when fps x duration exceeds the frame ceiling', () => {
    const e = estimateAsciiPdf({ ...base, fps: 24, duration: 60, maxFrames: 600 })
    expect(e.frames).toBe(600) // 1440 clamped
    expect(e.capped).toBe(true)
  })

  it('scales encode time with clip length even when frames are capped equal', () => {
    const a = estimateAsciiPdf({ ...base, fps: 24, duration: 60, maxFrames: 600 })
    const b = estimateAsciiPdf({ ...base, fps: 24, duration: 180, maxFrames: 600 })
    expect(a.frames).toBe(600)
    expect(b.frames).toBe(600) // both capped, same frame count
    expect(b.encodeMs).toBeGreaterThan(a.encodeMs) // longer clip still estimates longer
  })

  it('keeps at least one frame for a tiny duration', () => {
    const e = estimateAsciiPdf({ ...base, fps: 12, duration: 0.01 })
    expect(e.frames).toBe(1)
  })
})
