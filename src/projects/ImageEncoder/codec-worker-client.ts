// Main-thread client for the codec worker. Lazily spins up one worker and
// correlates requests by id, so the encode/decode loops never block the UI.

import { Base, RasterImage } from './image-encoder.types'
import { CapacityExceededError, DecodedImage } from './engine/codec'
import { DiffStats } from './engine/diff'

interface Pending {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

// Reject every in-flight request and drop the worker. Without this a crashed
// worker would leave promises (and the UI's busy flag) hanging forever, so the
// page would look frozen. The next call spins up a fresh worker.
function discardWorker(reason: Error): void {
  pending.forEach((entry) => entry.reject(reason))
  pending.clear()
  if (worker) {
    worker.terminate()
    worker = null
  }
}

// Reclaim the singleton worker when the encoder page unmounts — nothing else
// owns its lifetime, so the thread would otherwise linger for the whole session.
export function terminateWorker(): void {
  discardWorker(new Error('The image worker was stopped'))
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./codec.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent) => {
      const { id, ok, capacity, needed, available, ...rest } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      if (ok) entry.resolve(rest)
      else
        entry.reject(
          capacity ? new CapacityExceededError(needed, available) : new Error('Encoding failed')
        )
    }
    worker.onerror = () => discardWorker(new Error('The image worker stopped unexpectedly'))
    worker.onmessageerror = () =>
      discardWorker(new Error('The image worker sent an unreadable message'))
  }
  return worker
}

function request<T>(message: Record<string, unknown>, transfer: Transferable[]): Promise<T> {
  const target = getWorker()
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
    try {
      target.postMessage({ id, ...message }, transfer)
    } catch (cause) {
      // A failed post never resolves, so drop the entry and surface the error.
      pending.delete(id)
      reject(cause instanceof Error ? cause : new Error('Could not reach the image worker'))
    }
  })
}

export interface EncodeOptions {
  base: Base
  encrypted: boolean
  spread: boolean
  seed: number
  salt: Uint8Array | null
  iv: Uint8Array | null
}

export interface EncodeResult {
  stego: RasterImage
  diff: RasterImage
  stats: DiffStats
}

export async function encodeInWorker(
  raster: RasterImage,
  payloadBytes: Uint8Array,
  options: EncodeOptions
): Promise<EncodeResult> {
  // Send a throwaway copy so the caller's source raster survives the transfer.
  const rasterData = new Uint8ClampedArray(raster.data)
  const result = await request<{
    stego: Uint8ClampedArray
    diff: Uint8ClampedArray
    width: number
    height: number
    stats: DiffStats
  }>(
    {
      type: 'encode',
      rasterData,
      width: raster.width,
      height: raster.height,
      payloadBytes,
      base: options.base,
      encrypted: options.encrypted,
      spread: options.spread,
      seed: options.seed,
      salt: options.salt,
      iv: options.iv,
    },
    [rasterData.buffer, payloadBytes.buffer] as Transferable[]
  )
  return {
    stego: { data: result.stego, width: result.width, height: result.height },
    diff: { data: result.diff, width: result.width, height: result.height },
    stats: result.stats,
  }
}

export async function decodeInWorker(raster: RasterImage): Promise<DecodedImage | null> {
  const rasterData = new Uint8ClampedArray(raster.data)
  const result = await request<{ found: DecodedImage | null }>(
    { type: 'decode', rasterData, width: raster.width, height: raster.height },
    [rasterData.buffer] as Transferable[]
  )
  return result.found
}
