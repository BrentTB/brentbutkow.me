// Embeds and extracts a payload in an image's RGB channels. Alpha is left
// untouched. The header rides in base-2 LSBs at the start; the payload body uses
// the chosen base and is scattered across the rest of the image by a seeded
// permutation. Each written channel moves to the nearest value with the right
// remainder, so the picture shifts as little as possible.

import { Base } from '../image-encoder.types'
import { bytesToDigits, byteCountToDigits, digitsToBytes } from './bit-stream'
import { makePermutation } from './permute'
import {
  CORE_HEADER_BYTES,
  CRYPTO_PARAM_BYTES,
  ImageHeader,
  packHeader,
  parseCoreHeader,
  parseCryptoParams,
} from './header'

export interface EmbedOptions {
  base: Base
  encrypted: boolean
  // Scatter the body across the whole image (true) or fill sequentially (false).
  spread: boolean
  seed: number
  salt: Uint8Array | null
  iv: Uint8Array | null
}

export interface DecodedImage {
  base: Base
  encrypted: boolean
  payload: Uint8Array
  salt: Uint8Array | null
  iv: Uint8Array | null
}

export class CapacityExceededError extends Error {
  constructor(
    readonly needed: number,
    readonly available: number
  ) {
    super(`payload needs ${needed} channels but the image holds ${available}`)
    this.name = 'CapacityExceededError'
  }
}

// RGB channels available for digits (alpha is skipped).
export function channelSlots(width: number, height: number): number {
  return width * height * 3
}

// Returns a new RGBA buffer with the payload embedded; the input is untouched.
export function embedPayload(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  payload: Uint8Array,
  options: EmbedOptions
): Uint8ClampedArray {
  const header: ImageHeader = {
    base: options.base,
    encrypted: options.encrypted,
    spread: options.spread,
    payloadByteLength: payload.length,
    seed: options.seed,
    salt: options.salt,
    iv: options.iv,
  }
  const headerDigits = bytesToDigits(packHeader(header), Base.binary)
  const bodyDigits = bytesToDigits(payload, options.base)
  const headerSlots = headerDigits.length
  const bodySlots = channelSlots(width, height) - headerSlots
  if (bodyDigits.length > bodySlots) {
    throw new CapacityExceededError(headerSlots + bodyDigits.length, channelSlots(width, height))
  }

  const out = new Uint8ClampedArray(data)
  // Header stays sequential so a decoder can read it before learning the seed.
  writeDigits(out, 0, headerDigits, Base.binary)
  if (options.spread) {
    // Scatter the body across the remaining channels in the seeded order.
    const order = makePermutation(bodySlots, options.seed)
    for (let i = 0; i < bodyDigits.length; i++) {
      const index = dataIndexForSlot(headerSlots + order.at(i))
      out[index] = nearestWithRemainder(out[index], options.base, bodyDigits[i])
    }
  } else {
    // Fill channels sequentially; leaves the rest of the image pristine, which
    // keeps the PNG far smaller.
    writeDigits(out, headerSlots, bodyDigits, options.base)
  }
  return out
}

// Reads an embedded payload, or null if the image carries no valid header.
export function extractPayload(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DecodedImage | null {
  const total = channelSlots(width, height)
  const coreSlots = CORE_HEADER_BYTES * 8
  if (total < coreSlots) return null

  const core = parseCoreHeader(
    digitsToBytes(readDigits(data, 0, coreSlots, Base.binary), Base.binary, CORE_HEADER_BYTES)
  )
  if (!core) return null

  let headerSlots = coreSlots
  let salt: Uint8Array | null = null
  let iv: Uint8Array | null = null
  if (core.encrypted) {
    const cryptoSlots = CRYPTO_PARAM_BYTES * 8
    if (coreSlots + cryptoSlots > total) return null
    const cryptoBytes = digitsToBytes(
      readDigits(data, coreSlots, cryptoSlots, Base.binary),
      Base.binary,
      CRYPTO_PARAM_BYTES
    )
    ;({ salt, iv } = parseCryptoParams(cryptoBytes))
    headerSlots = coreSlots + cryptoSlots
  }

  const bodySlots = total - headerSlots
  const bodyDigitCount = byteCountToDigits(core.payloadByteLength, core.base)
  if (bodyDigitCount > bodySlots) return null

  let digits: number[]
  if (core.spread) {
    // Re-create the same scatter order from the seed and read the body back.
    const order = makePermutation(bodySlots, core.seed)
    digits = new Array<number>(bodyDigitCount)
    for (let i = 0; i < bodyDigitCount; i++) {
      digits[i] = data[dataIndexForSlot(headerSlots + order.at(i))] % core.base
    }
  } else {
    digits = readDigits(data, headerSlots, bodyDigitCount, core.base)
  }
  const payload = digitsToBytes(digits, core.base, core.payloadByteLength)
  return { base: core.base, encrypted: core.encrypted, payload, salt, iv }
}

function dataIndexForSlot(slot: number): number {
  return Math.floor(slot / 3) * 4 + (slot % 3)
}

function readDigits(
  data: Uint8ClampedArray,
  startSlot: number,
  count: number,
  base: number
): number[] {
  const digits = new Array<number>(count)
  for (let i = 0; i < count; i++) digits[i] = data[dataIndexForSlot(startSlot + i)] % base
  return digits
}

function writeDigits(
  data: Uint8ClampedArray,
  startSlot: number,
  digits: number[],
  base: number
): void {
  for (let i = 0; i < digits.length; i++) {
    const index = dataIndexForSlot(startSlot + i)
    data[index] = nearestWithRemainder(data[index], base, digits[i])
  }
}

// Closest value to `value` in [0, 255] whose remainder mod base equals digit.
function nearestWithRemainder(value: number, base: number, digit: number): number {
  const candidate = digit + Math.round((value - digit) / base) * base
  if (candidate < 0) return digit
  if (candidate > 255) return digit + Math.floor((255 - digit) / base) * base
  return candidate
}
