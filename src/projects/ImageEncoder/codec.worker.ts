// Runs the CPU-heavy embed/extract/diff off the main thread so a large image
// can't freeze the page. A thin dispatcher around the pure engine; results are
// transferred back (no copy) where possible.

import { Base } from './image-encoder.types'
import { DecodedImage, embedPayload, extractPayload } from './engine/codec'
import { buildDiff } from './engine/diff'

interface EncodeRequest {
  id: number
  type: 'encode'
  rasterData: Uint8ClampedArray
  width: number
  height: number
  payloadBytes: Uint8Array
  base: Base
  encrypted: boolean
  spread: boolean
  seed: number
  salt: Uint8Array | null
  iv: Uint8Array | null
}

interface DecodeRequest {
  id: number
  type: 'decode'
  rasterData: Uint8ClampedArray
  width: number
  height: number
}

const ctx = self as unknown as Worker

ctx.onmessage = (event: MessageEvent) => {
  const request = event.data as EncodeRequest | DecodeRequest
  try {
    if (request.type === 'encode') {
      const { rasterData, width, height } = request
      const stego = embedPayload(rasterData, width, height, request.payloadBytes, {
        base: request.base,
        encrypted: request.encrypted,
        spread: request.spread,
        seed: request.seed,
        salt: request.salt,
        iv: request.iv,
      })
      const { raster: diff, stats } = buildDiff(
        { data: rasterData, width, height },
        { data: stego, width, height }
      )
      ctx.postMessage({ id: request.id, ok: true, stego, diff: diff.data, width, height, stats }, [
        stego.buffer,
        diff.data.buffer,
      ] as Transferable[])
    } else {
      const found: DecodedImage | null = extractPayload(
        request.rasterData,
        request.width,
        request.height
      )
      ctx.postMessage({ id: request.id, ok: true, found })
    }
  } catch (cause) {
    const capacity = cause instanceof Error && cause.name === 'CapacityExceededError'
    ctx.postMessage({ id: request.id, ok: false, capacity })
  }
}
