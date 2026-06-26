import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useDecoder } from './useDecoder'
import { Base } from './image-encoder.types'
import { embedPayload, extractPayload } from './engine/codec'

vi.mock('./canvas-image', () => ({
  fileToImage: vi.fn(),
  rasterToPngBlob: vi.fn(),
}))

// The worker is mocked to run the real extract synchronously.
vi.mock('./codec-worker-client', () => ({
  encodeInWorker: vi.fn(),
  decodeInWorker: vi.fn(),
}))

import { fileToImage } from './canvas-image'
import { decodeInWorker } from './codec-worker-client'

const fileToImageMock = vi.mocked(fileToImage)
const decodeInWorkerMock = vi.mocked(decodeInWorker)
const file = new File(['x'], 'stego.png', { type: 'image/png' })

function makeCover(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i * 3) % 256
    data[i + 1] = (i * 5) % 256
    data[i + 2] = (i * 7) % 256
    data[i + 3] = 255
  }
  return data
}

const loaded = (data: Uint8ClampedArray, width: number, height: number) => ({
  raster: { data, width, height },
  previewBlob: new Blob(['preview']),
})

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`)
  URL.revokeObjectURL = vi.fn()
  decodeInWorkerMock.mockImplementation(async (raster) =>
    extractPayload(raster.data, raster.width, raster.height)
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useDecoder', () => {
  it('reads a hidden message on upload', async () => {
    const stego = embedPayload(makeCover(64, 64), 64, 64, new TextEncoder().encode('found me'), {
      base: Base.ternary,
      encrypted: false,
      salt: null,
      iv: null,
    })
    fileToImageMock.mockResolvedValue(loaded(stego, 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.text).toBe('found me')
    expect(result.current.decoded?.encrypted).toBe(false)
  })

  it('reports an image with no hidden message', async () => {
    fileToImageMock.mockResolvedValue(loaded(new Uint8ClampedArray(64 * 64 * 4), 64, 64))
    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))
    expect(result.current.decoded).toBeNull()
    expect(result.current.error).toMatch(/no hidden message/i)
  })

  it('flags an encrypted message as needing a key', async () => {
    const stego = embedPayload(makeCover(64, 64), 64, 64, new Uint8Array([1, 2, 3, 4, 5]), {
      base: Base.binary,
      encrypted: true,
      salt: new Uint8Array(16).fill(7),
      iv: new Uint8Array(12).fill(9),
    })
    fileToImageMock.mockResolvedValue(loaded(stego, 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.needsKey).toBe(true)
    expect(result.current.decoded?.text).toBeNull()
  })
})
