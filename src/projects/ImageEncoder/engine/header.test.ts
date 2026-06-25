import { describe, expect, it } from 'vitest'
import { Base } from '../image-encoder.types'
import {
  CORE_HEADER_BYTES,
  CRYPTO_PARAM_BYTES,
  IV_BYTES,
  MAGIC,
  SALT_BYTES,
  VERSION,
  packHeader,
  parseCoreHeader,
  parseCryptoParams,
  totalHeaderBytes,
} from './header'

const plain = {
  base: Base.quaternary,
  encrypted: false,
  payloadByteLength: 1234,
  salt: null,
  iv: null,
}

describe('totalHeaderBytes', () => {
  it('adds salt + iv only when encrypted', () => {
    expect(totalHeaderBytes(false)).toBe(CORE_HEADER_BYTES)
    expect(totalHeaderBytes(true)).toBe(CORE_HEADER_BYTES + CRYPTO_PARAM_BYTES)
    expect(CRYPTO_PARAM_BYTES).toBe(SALT_BYTES + IV_BYTES)
  })
})

describe('packHeader / parseCoreHeader', () => {
  it('round-trips a plain header', () => {
    const parsed = parseCoreHeader(packHeader(plain))
    expect(parsed).toEqual({ base: Base.quaternary, encrypted: false, payloadByteLength: 1234 })
  })

  it('round-trips an encrypted header with crypto params', () => {
    const salt = Uint8Array.from({ length: SALT_BYTES }, (_, i) => i + 1)
    const iv = Uint8Array.from({ length: IV_BYTES }, (_, i) => 200 - i)
    const bytes = packHeader({ ...plain, encrypted: true, salt, iv })
    expect(bytes.length).toBe(totalHeaderBytes(true))

    const core = parseCoreHeader(bytes)
    expect(core).toEqual({ base: Base.quaternary, encrypted: true, payloadByteLength: 1234 })
    expect(parseCryptoParams(bytes.slice(CORE_HEADER_BYTES))).toEqual({ salt, iv })
  })

  it('survives a 32-bit payload length', () => {
    const big = 3_000_000_000
    expect(
      parseCoreHeader(packHeader({ ...plain, payloadByteLength: big }))?.payloadByteLength
    ).toBe(big)
  })

  it('rejects a wrong magic marker', () => {
    const bytes = packHeader(plain)
    bytes[0] = MAGIC[0] ^ 0xff
    expect(parseCoreHeader(bytes)).toBeNull()
  })

  it('rejects an unknown version', () => {
    const bytes = packHeader(plain)
    bytes[MAGIC.length] = VERSION + 1
    expect(parseCoreHeader(bytes)).toBeNull()
  })

  it('rejects an unsupported base', () => {
    const bytes = packHeader(plain)
    bytes[MAGIC.length + 1] = 5
    expect(parseCoreHeader(bytes)).toBeNull()
  })

  it('rejects a truncated buffer', () => {
    expect(parseCoreHeader(packHeader(plain).slice(0, CORE_HEADER_BYTES - 1))).toBeNull()
  })

  it('throws when an encrypted header is missing crypto params', () => {
    expect(() => packHeader({ ...plain, encrypted: true })).toThrow(RangeError)
  })
})
