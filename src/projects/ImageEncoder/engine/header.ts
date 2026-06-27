// Self-describing header embedded ahead of the payload. The header is always
// stored in base-2 (plain LSBs) so a decoder can read it without first knowing
// the payload's base. Magic + version let a decoder reject images that hold no
// payload instead of returning noise.

import { Base, isBase } from '../image-encoder.types'

// 'IMEN' — Image ENcoder. A 4-byte marker keeps false positives near zero.
export const MAGIC = [0x49, 0x4d, 0x45, 0x4e]
export const VERSION = 1
export const SALT_BYTES = 16
export const IV_BYTES = 12
export const CRYPTO_PARAM_BYTES = SALT_BYTES + IV_BYTES

const FLAG_ENCRYPTED = 0b1
const FLAG_SPREAD = 0b10
const LENGTH_BYTES = 4
const SEED_BYTES = 4

// magic + version + base + flags + uint32 payload length + uint32 scatter seed
export const CORE_HEADER_BYTES = MAGIC.length + 1 + 1 + 1 + LENGTH_BYTES + SEED_BYTES

export interface ImageHeader {
  base: Base
  encrypted: boolean
  // When true, the payload is scattered across the image by the seed; otherwise
  // it fills channels sequentially (smaller file).
  spread: boolean
  payloadByteLength: number
  // Seeds the permutation that scatters the payload (used only when spread).
  seed: number
  salt: Uint8Array | null
  iv: Uint8Array | null
}

export interface CoreHeader {
  base: Base
  encrypted: boolean
  spread: boolean
  payloadByteLength: number
  seed: number
}

export function totalHeaderBytes(encrypted: boolean): number {
  return CORE_HEADER_BYTES + (encrypted ? CRYPTO_PARAM_BYTES : 0)
}

export function packHeader(header: ImageHeader): Uint8Array {
  const bytes = new Uint8Array(totalHeaderBytes(header.encrypted))
  let o = 0
  for (const byte of MAGIC) bytes[o++] = byte
  bytes[o++] = VERSION
  bytes[o++] = header.base
  bytes[o++] = (header.encrypted ? FLAG_ENCRYPTED : 0) | (header.spread ? FLAG_SPREAD : 0)
  bytes[o++] = (header.payloadByteLength >>> 24) & 0xff
  bytes[o++] = (header.payloadByteLength >>> 16) & 0xff
  bytes[o++] = (header.payloadByteLength >>> 8) & 0xff
  bytes[o++] = header.payloadByteLength & 0xff
  bytes[o++] = (header.seed >>> 24) & 0xff
  bytes[o++] = (header.seed >>> 16) & 0xff
  bytes[o++] = (header.seed >>> 8) & 0xff
  bytes[o++] = header.seed & 0xff
  if (header.encrypted) {
    if (header.salt?.length !== SALT_BYTES) {
      throw new RangeError(`encrypted header needs a ${SALT_BYTES}-byte salt`)
    }
    if (header.iv?.length !== IV_BYTES) {
      throw new RangeError(`encrypted header needs a ${IV_BYTES}-byte iv`)
    }
    bytes.set(header.salt, o)
    o += SALT_BYTES
    bytes.set(header.iv, o)
  }
  return bytes
}

// Reads the fixed prefix. Returns null when the bytes are not a valid header,
// so a decoder can cleanly report "no message here".
export function parseCoreHeader(bytes: Uint8Array): CoreHeader | null {
  if (bytes.length < CORE_HEADER_BYTES) return null
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) return null
  }
  let o = MAGIC.length
  if (bytes[o++] !== VERSION) return null
  const base = bytes[o++]
  if (!isBase(base)) return null
  const flags = bytes[o++]
  const encrypted = (flags & FLAG_ENCRYPTED) === FLAG_ENCRYPTED
  const spread = (flags & FLAG_SPREAD) === FLAG_SPREAD
  const payloadByteLength =
    ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0
  o += LENGTH_BYTES
  const seed = ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0
  return { base, encrypted, spread, payloadByteLength, seed }
}

// Splits the crypto-parameter region (the bytes following the core header).
export function parseCryptoParams(bytes: Uint8Array): { salt: Uint8Array; iv: Uint8Array } {
  return {
    salt: bytes.slice(0, SALT_BYTES),
    iv: bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES),
  }
}
