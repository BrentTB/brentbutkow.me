import { describe, it, expect } from 'vitest'
import { deflate } from './deflate'

async function inflate(bytes: Uint8Array<ArrayBuffer>, format: CompressionFormat) {
  const out = new Response(bytes).body!.pipeThrough(new DecompressionStream(format))
  return new Response(out).text()
}

describe('deflate', () => {
  const text = 'abcabcabc'.repeat(200)
  const input = new TextEncoder().encode(text)

  it.each(['deflate', 'deflate-raw'] as const)('round-trips and shrinks as %s', async (format) => {
    const packed = await deflate(input, format)
    expect(packed.length).toBeLessThan(input.length / 10)
    expect(await inflate(packed, format)).toBe(text)
  })

  it('writes a zlib header for deflate, which PDF FlateDecode needs', async () => {
    const packed = await deflate(input, 'deflate')
    expect(packed[0]).toBe(0x78)
  })
})
