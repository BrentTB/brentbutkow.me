import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useDecoder } from './useDecoder'
import { Base } from './image-encoder.types'
import { embedPayload, extractPayload } from './engine/codec'
import { PayloadKind, packPayload } from './engine/payload'
import { encryptMessage } from './engine/crypto'

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
  it('reads a hidden text message on upload', async () => {
    const envelope = packPayload({
      kind: PayloadKind.text,
      name: '',
      bytes: new TextEncoder().encode('found me'),
    })
    const stego = embedPayload(makeCover(64, 64), 64, 64, envelope, {
      base: Base.ternary,
      encrypted: false,
      spread: true,
      seed: 555,
      salt: null,
      iv: null,
    })
    fileToImageMock.mockResolvedValue(loaded(stego, 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.kind).toBe(PayloadKind.text)
    expect(result.current.decoded?.text).toBe('found me')
    expect(result.current.decoded?.encrypted).toBe(false)
  })

  it('reveals a hidden file with its name', async () => {
    const fileBytes = Uint8Array.from([42, 7, 0, 255, 13])
    const envelope = packPayload({ kind: PayloadKind.file, name: 'secret.dat', bytes: fileBytes })
    const stego = embedPayload(makeCover(64, 64), 64, 64, envelope, {
      base: Base.binary,
      encrypted: false,
      spread: false,
      seed: 555,
      salt: null,
      iv: null,
    })
    fileToImageMock.mockResolvedValue(loaded(stego, 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.kind).toBe(PayloadKind.file)
    expect(result.current.decoded?.fileName).toBe('secret.dat')
    expect(result.current.decoded?.fileUrl).not.toBeNull()
    expect(result.current.decoded?.text).toBeNull()
  })

  it('reports an image with no hidden message', async () => {
    fileToImageMock.mockResolvedValue(loaded(new Uint8ClampedArray(64 * 64 * 4), 64, 64))
    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))
    expect(result.current.decoded).toBeNull()
    expect(result.current.error).toMatch(/no hidden message/i)
  })

  it('keeps the newest decode when an older request resolves last', async () => {
    // Both decodes are held in flight, then resolved out of order (older one
    // last). Without latest-request guarding, the stale older result would
    // clobber the newer one. fileToImage is deferred too, so the older request
    // reaches its decode before the newer request begins.
    const fileResolvers: Array<() => void> = []
    fileToImageMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          fileResolvers.push(() => resolve(loaded(makeCover(64, 64), 64, 64)))
        )
    )
    const decodeResolvers: Array<(found: ReturnType<typeof extractPayload>) => void> = []
    decodeInWorkerMock.mockImplementation(
      () => new Promise((resolve) => decodeResolvers.push(resolve))
    )

    const envelope = (text: string) =>
      packPayload({ kind: PayloadKind.text, name: '', bytes: new TextEncoder().encode(text) })
    const found = (text: string) => ({
      base: Base.binary,
      encrypted: false,
      payload: envelope(text),
      salt: null,
      iv: null,
    })

    const { result } = renderHook(() => useDecoder())
    const older = new File(['a'], 'older.png', { type: 'image/png' })
    const newer = new File(['b'], 'newer.png', { type: 'image/png' })

    await act(async () => {
      result.current.loadImage(older)
      fileResolvers[0]()
    })
    expect(decodeResolvers).toHaveLength(1) // older's decode is in flight

    await act(async () => {
      result.current.loadImage(newer)
      fileResolvers[1]()
    })
    expect(decodeResolvers).toHaveLength(2) // newer's decode joins it

    await act(async () => decodeResolvers[1](found('newer')))
    await act(async () => decodeResolvers[0](found('older')))

    expect(result.current.decoded?.text).toBe('newer')
  })

  it('flags an encrypted message as needing a key', async () => {
    const stego = embedPayload(makeCover(64, 64), 64, 64, new Uint8Array([1, 2, 3, 4, 5]), {
      base: Base.binary,
      encrypted: true,
      spread: false,
      seed: 555,
      salt: new Uint8Array(16).fill(7),
      iv: new Uint8Array(12).fill(9),
    })
    fileToImageMock.mockResolvedValue(loaded(stego, 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))

    expect(result.current.decoded?.needsKey).toBe(true)
    expect(result.current.decoded?.text).toBeNull()
  })

  async function sealedStego(text: string, key: string): Promise<Uint8ClampedArray> {
    const envelope = packPayload({
      kind: PayloadKind.text,
      name: '',
      bytes: new TextEncoder().encode(text),
    })
    const sealed = await encryptMessage(envelope, key)
    return embedPayload(makeCover(64, 64), 64, 64, sealed.ciphertext, {
      base: Base.binary,
      encrypted: true,
      spread: false,
      seed: 555,
      salt: sealed.salt,
      iv: sealed.iv,
    })
  }

  it('unlocks an encrypted message with the right key', async () => {
    fileToImageMock.mockResolvedValue(loaded(await sealedStego('top secret', 'hunter2'), 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))
    expect(result.current.decoded?.needsKey).toBe(true)

    act(() => result.current.setPassphrase('hunter2'))
    await act(async () => result.current.submitKey())

    expect(result.current.decoded?.text).toBe('top secret')
    expect(result.current.decoded?.encrypted).toBe(true)
    expect(result.current.decoded?.needsKey).toBe(false)
  })

  it('rejects the wrong key', async () => {
    fileToImageMock.mockResolvedValue(loaded(await sealedStego('top secret', 'hunter2'), 64, 64))

    const { result } = renderHook(() => useDecoder())
    await act(async () => result.current.loadImage(file))

    act(() => result.current.setPassphrase('wrong'))
    await act(async () => result.current.submitKey())

    expect(result.current.error).toMatch(/did not work/i)
    expect(result.current.decoded?.text).toBeNull()
  })
})
