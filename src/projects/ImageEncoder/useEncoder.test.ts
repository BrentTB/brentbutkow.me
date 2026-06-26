import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useEncoder } from './useEncoder'
import { Base, PayloadMode, RasterImage } from './image-encoder.types'
import { embedPayload, extractPayload } from './engine/codec'
import { PayloadKind, unpackPayload } from './engine/payload'
import { buildDiff } from './engine/diff'
import { maxPayloadBytes } from './engine/capacity'

vi.mock('./canvas-image', () => ({
  fileToImage: vi.fn(),
  rasterToPngBlob: vi.fn(),
}))

// The worker is mocked to run the real engine synchronously, so these tests
// exercise the actual embed pipeline without spinning up a Worker.
vi.mock('./codec-worker-client', () => ({
  encodeInWorker: vi.fn(),
  decodeInWorker: vi.fn(),
}))

import { fileToImage, rasterToPngBlob } from './canvas-image'
import { encodeInWorker } from './codec-worker-client'

const fileToImageMock = vi.mocked(fileToImage)
const rasterToPngBlobMock = vi.mocked(rasterToPngBlob)
const encodeInWorkerMock = vi.mocked(encodeInWorker)
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

const loaded = (width: number, height: number) => ({
  raster: makeRaster(width, height),
  previewBlob: new Blob(['preview']),
})

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`)
  URL.revokeObjectURL = vi.fn()
  rasterToPngBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  fileToImageMock.mockResolvedValue(loaded(64, 64))
  encodeInWorkerMock.mockImplementation(async (raster, payload, options) => {
    const stegoData = embedPayload(raster.data, raster.width, raster.height, payload, options)
    const stego = { data: stegoData, width: raster.width, height: raster.height }
    const { raster: diff, stats } = buildDiff(raster, stego)
    return { stego, diff, stats }
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useEncoder', () => {
  it('starts with defaults and no source', () => {
    const { result } = renderHook(() => useEncoder())
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

    const { result } = renderHook(() => useEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('meet at noon'))
    await act(async () => result.current.runEncode())

    expect(result.current.error).toBeNull()
    expect(result.current.encoded).not.toBeNull()
    const stego = captured[0]
    const decoded = extractPayload(stego.data, stego.width, stego.height)
    const payload = unpackPayload(decoded?.payload ?? new Uint8Array())
    expect(payload?.kind).toBe(PayloadKind.text)
    expect(decoder.decode(payload?.bytes)).toBe('meet at noon')
  })

  it('hides an uploaded file with its name', async () => {
    const captured: RasterImage[] = []
    rasterToPngBlobMock.mockImplementation((raster) => {
      captured.push(raster)
      return Promise.resolve(new Blob(['png']))
    })
    const fileBytes = Uint8Array.from([5, 6, 7, 8, 9])
    const secret = new File([fileBytes], 'notes.bin', { type: 'application/octet-stream' })

    const { result } = renderHook(() => useEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setPayloadMode(PayloadMode.file))
    await act(async () => result.current.loadSecretFile(secret))
    await act(async () => result.current.runEncode())

    expect(result.current.error).toBeNull()
    const stego = captured[0]
    const decoded = extractPayload(stego.data, stego.width, stego.height)
    const payload = unpackPayload(decoded?.payload ?? new Uint8Array())
    expect(payload?.kind).toBe(PayloadKind.file)
    expect(payload?.name).toBe('notes.bin')
    expect(payload?.bytes).toEqual(fileBytes)
  })

  it('tracks capacity for the typed message', async () => {
    const { result } = renderHook(() => useEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('hi'))
    expect(result.current.capacity?.fits).toBe(true)
    // 2 message bytes + the 3-byte envelope header (kind + name length).
    expect(result.current.capacity?.usedBytes).toBe(5)
  })

  it('suggests the gentlest base that fits when the message overflows', async () => {
    fileToImageMock.mockResolvedValue(loaded(16, 16))
    const binaryMax = maxPayloadBytes(16, 16, Base.binary, false)
    const { result } = renderHook(() => useEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('a'.repeat(binaryMax + 1)))

    expect(result.current.capacity?.fits).toBe(false)
    expect(result.current.fitHint.suggestedBase).toBe(Base.ternary)
    expect(result.current.fitHint.tooBig).toBe(false)
  })

  it('flags a message too big for any base', async () => {
    fileToImageMock.mockResolvedValue(loaded(16, 16))
    const quaternaryMax = maxPayloadBytes(16, 16, Base.quaternary, false)
    const { result } = renderHook(() => useEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('a'.repeat(quaternaryMax + 1)))

    expect(result.current.fitHint.suggestedBase).toBeNull()
    expect(result.current.fitHint.tooBig).toBe(true)
  })

  it('reports an encode that exceeds capacity', async () => {
    fileToImageMock.mockResolvedValue(loaded(2, 2))
    const { result } = renderHook(() => useEncoder())
    await act(async () => result.current.loadImage(file))
    act(() => result.current.setMessage('way too much for four pixels'))
    await act(async () => result.current.runEncode())
    expect(result.current.encoded).toBeNull()
    expect(result.current.error).toMatch(/too big/i)
  })
})
