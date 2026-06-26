// Optional key layer: derives an AES-GCM key from a passphrase (PBKDF2) and
// encrypts/decrypts the message before it ever reaches the pixels. The salt and
// iv aren't secret — they ride in the image header. A wrong key fails GCM
// authentication, so decryption throws cleanly instead of returning garbage.

import { IV_BYTES, SALT_BYTES } from './header'

const PBKDF2_ITERATIONS = 250_000
const AES_KEY_BITS = 256

export class WrongKeyError extends Error {
  constructor() {
    super('wrong key or corrupted message')
    this.name = 'WrongKeyError'
  }
}

export interface EncryptedPayload {
  ciphertext: Uint8Array
  salt: Uint8Array
  iv: Uint8Array
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(
  plaintext: Uint8Array,
  passphrase: string
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt)
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { ciphertext: new Uint8Array(buffer), salt, iv }
}

export async function decryptMessage(
  ciphertext: Uint8Array,
  passphrase: string,
  salt: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const key = await deriveKey(passphrase, salt)
  try {
    const buffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new Uint8Array(buffer)
  } catch {
    throw new WrongKeyError()
  }
}
