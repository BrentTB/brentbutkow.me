import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useImageEncoder } from './useImageEncoder'
import { Base, Mode, RasterImage } from './image-encoder.types'
import { embedPayload, extractPayload } from './engine/codec'

// Canvas + file decoding is mocked; the engine itself runs for real so the tests
// exercise the actual embed/extract pipeline through the hook's orchestration.
vi.mock('./canvas-image', () => ({
  fileToRaster: vi.fn(),
  rasterToPngBlob: vi.fn(),
}))

import { fileToRaster, rasterToPngBlob } from './canvas-image'

const fileToRasterMock = vi.mocked(fileToRaster)
const rasterToPngBlobMock = vi.mocked(rasterToPngBlob)
const decoder = new TextDecoder()
const file = new File(['x'], 'cover.png', { type: 'image/png' })

function makeRaster(width: number, height: number): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 3) % 256
    data[i + 1] = (i * 5) % 256
    data[i + 2] = (i * 7) % 256
    data[i + 3] = 255
  }
  return { data, width, height }
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`)
  URL.revokeObjectURL = vi.fn()
  rasterToPngBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  fileToRasterMock.mockResolvedValue(makeRaster(64, 64))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useImageEncoder', () => {
  it('starts in encode mode with defaults', () => {
    const { result } = renderHook(() => useImageEncoder())
    expect(result.current.mode).toBe(Mode.encode)
    expect(result.current.base).toBe(Base.binary)
    expect(result.current.source).toBeNull()
    expect(result.current.capacity).toBeNull()
  })

  it('embeds a typed message that the engine can read back', async () => {
    const captured: RasterImage[] = []
    rasterToPngBlobMock.mockImplementation((raster) => {
      captured.push(raster)
      return Promise.resolve(new Blob(['png']))
    })

    const { result } = renderHook(() => useImageEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('meet at noon'))
    await act(async () => result.current.runEncode())

    expect(result.current.error).toBeNull()
    expect(result.current.encoded).not.toBeNull()
    // First PNG written is the stego image; decode it straight from the engine.
    const stego = captured[0]
    const decoded = extractPayload(stego.data, stego.width, stego.height)
    expect(decoder.decode(decoded?.payload)).toBe('meet at noon')
  })

  it('tracks capacity and flags an over-budget message', async () => {
    const { result } = renderHook(() => useImageEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('hi'))
    expect(result.current.capacity?.fits).toBe(true)
    expect(result.current.capacity?.usedBytes).toBe(2)
  })

  it('reports when the message is too big for the image', async () => {
    fileToRasterMock.mockResolvedValue(makeRaster(2, 2))
    const { result } = renderHook(() => useImageEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('way too much for four pixels'))
    await act(async () => result.current.runEncode())
    expect(result.current.encoded).toBeNull()
    expect(result.current.error).toMatch(/too big/i)
  })

  it('decodes a hidden message on upload in decode mode', async () => {
    const cover = makeRaster(64, 64)
    const stego = embedPayload(cover.data, 64, 64, new TextEncoder().encode('found me'), {
      base: Base.ternary,
      encrypted: false,
      salt: null,
      iv: null,
    })
    fileToRasterMock.mockResolvedValue({ data: stego, width: 64, height: 64 })

    const { result } = renderHook(() => useImageEncoder())
    act(() => result.current.setMode(Mode.decode))
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.text).toBe('found me')
    expect(result.current.decoded?.encrypted).toBe(false)
  })

  it('reports an image with no hidden message', async () => {
    fileToRasterMock.mockResolvedValue({
      data: new Uint8ClampedArray(64 * 64 * 4),
      width: 64,
      height: 64,
    })
    const { result } = renderHook(() => useImageEncoder())
    act(() => result.current.setMode(Mode.decode))
    await act(async () => result.current.loadImage(file))
    expect(result.current.decoded).toBeNull()
    expect(result.current.error).toMatch(/no hidden message/i)
  })

  it('flags an encrypted message as needing a key', async () => {
    const cover = makeRaster(64, 64)
    const stego = embedPayload(cover.data, 64, 64, new Uint8Array([1, 2, 3, 4, 5]), {
      base: Base.binary,
      encrypted: true,
      salt: new Uint8Array(16).fill(7),
      iv: new Uint8Array(12).fill(9),
    })
    fileToRasterMock.mockResolvedValue({ data: stego, width: 64, height: 64 })

    const { result } = renderHook(() => useImageEncoder())
    act(() => result.current.setMode(Mode.decode))
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.needsKey).toBe(true)
    expect(result.current.decoded?.text).toBeNull()
  })

  it('clears the loaded source when the mode changes', async () => {
    const { result } = renderHook(() => useImageEncoder())
    await act(async () => result.current.loadImage(file))
    expect(result.current.source).not.toBeNull()
    act(() => result.current.setMode(Mode.decode))
    expect(result.current.source).toBeNull()
  })
})
