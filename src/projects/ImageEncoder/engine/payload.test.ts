import { describe, expect, it } from 'vitest'
import { PayloadKind, packPayload, unpackPayload } from './payload'

describe('packPayload / unpackPayload', () => {
  it('round-trips a text payload', () => {
    const packed = packPayload({
      kind: PayloadKind.text,
      name: '',
      bytes: Uint8Array.from([104, 105]),
    })
    const out = unpackPayload(packed)
    expect(out?.kind).toBe(PayloadKind.text)
    expect(out?.name).toBe('')
    expect(out?.bytes).toEqual(Uint8Array.from([104, 105]))
  })

  it('round-trips a file payload with its name', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 255, 128])
    const out = unpackPayload(packPayload({ kind: PayloadKind.file, name: 'photo.png', bytes }))
    expect(out?.kind).toBe(PayloadKind.file)
    expect(out?.name).toBe('photo.png')
    expect(out?.bytes).toEqual(bytes)
  })

  it('preserves a unicode filename', () => {
    const name = 'café 🎉.txt'
    const out = unpackPayload(
      packPayload({ kind: PayloadKind.file, name, bytes: Uint8Array.from([1]) })
    )
    expect(out?.name).toBe(name)
  })

  it('handles empty content', () => {
    const out = unpackPayload(
      packPayload({ kind: PayloadKind.file, name: 'empty.bin', bytes: new Uint8Array(0) })
    )
    expect(out?.name).toBe('empty.bin')
    expect(out?.bytes.length).toBe(0)
  })

  it('rejects malformed envelopes', () => {
    expect(unpackPayload(new Uint8Array([0, 0]))).toBeNull() // shorter than the header
    expect(unpackPayload(Uint8Array.from([9, 0, 0]))).toBeNull() // unknown kind
    expect(unpackPayload(Uint8Array.from([1, 0, 5, 65]))).toBeNull() // name runs past the end
  })
})
