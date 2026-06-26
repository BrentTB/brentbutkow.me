// @vitest-environment node
// WebCrypto's SubtleCrypto lives on the Node global; jsdom doesn't implement it.
import { describe, expect, it } from 'vitest'
import { embedPayload, extractPayload } from './codec'
import { Base } from '../image-encoder.types'
import { WrongKeyError, decryptMessage, encryptMessage } from './crypto'

const plaintext = new TextEncoder().encode('the launch codes are 0000')

describe('encryptMessage / decryptMessage', () => {
  it('round-trips with the right key', async () => {
    const { ciphertext, salt, iv } = await encryptMessage(plaintext, 'hunter2')
    expect(ciphertext).not.toEqual(plaintext)
    const decrypted = await decryptMessage(ciphertext, 'hunter2', salt, iv)
    expect(decrypted).toEqual(plaintext)
  })

  it('uses a fresh salt and iv each time', async () => {
    const a = await encryptMessage(plaintext, 'pw')
    const b = await encryptMessage(plaintext, 'pw')
    expect(a.salt).not.toEqual(b.salt)
    expect(a.iv).not.toEqual(b.iv)
    expect(a.ciphertext).not.toEqual(b.ciphertext)
  })

  it('throws WrongKeyError on a bad key', async () => {
    const { ciphertext, salt, iv } = await encryptMessage(plaintext, 'correct')
    await expect(decryptMessage(ciphertext, 'wrong', salt, iv)).rejects.toBeInstanceOf(
      WrongKeyError
    )
  })
})

// The full encrypted pipeline: encrypt, embed (carrying salt + iv in the header),
// extract, then decrypt back to the original message.
describe('encrypted round-trip through the image', () => {
  it('hides and recovers an encrypted message', async () => {
    const cover = new Uint8ClampedArray(96 * 96 * 4).fill(128)
    const { ciphertext, salt, iv } = await encryptMessage(plaintext, 'open sesame')
    const stego = embedPayload(cover, 96, 96, ciphertext, {
      base: Base.ternary,
      encrypted: true,
      salt,
      iv,
    })

    const decoded = extractPayload(stego, 96, 96)
    expect(decoded?.encrypted).toBe(true)
    expect(decoded?.salt).toEqual(salt)
    expect(decoded?.iv).toEqual(iv)

    const recovered = await decryptMessage(
      decoded?.payload ?? new Uint8Array(),
      'open sesame',
      decoded?.salt ?? new Uint8Array(),
      decoded?.iv ?? new Uint8Array()
    )
    expect(recovered).toEqual(plaintext)
  })
})
