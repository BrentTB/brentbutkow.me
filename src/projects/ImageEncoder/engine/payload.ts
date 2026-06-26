// The payload envelope: a tiny self-describing wrapper around the hidden bytes
// so a decoder knows whether it pulled out a text message or a file (and its
// name). Built before encryption, so the filename is sealed along with the data.

export const PayloadKind = {
  text: 0,
  file: 1,
} as const
export type PayloadKind = (typeof PayloadKind)[keyof typeof PayloadKind]

export function isPayloadKind(value: number): value is PayloadKind {
  return value === PayloadKind.text || value === PayloadKind.file
}

export interface Payload {
  kind: PayloadKind
  name: string // empty for text
  bytes: Uint8Array
}

// kind (1) + name length (2, big-endian) + name + content
export const ENVELOPE_HEADER_BYTES = 3
const MAX_NAME_BYTES = 0xffff

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function packPayload(payload: Payload): Uint8Array {
  const nameBytes = encoder.encode(payload.name)
  if (nameBytes.length > MAX_NAME_BYTES) {
    throw new RangeError(`name is too long: ${nameBytes.length} bytes`)
  }
  const out = new Uint8Array(ENVELOPE_HEADER_BYTES + nameBytes.length + payload.bytes.length)
  out[0] = payload.kind
  out[1] = (nameBytes.length >>> 8) & 0xff
  out[2] = nameBytes.length & 0xff
  out.set(nameBytes, ENVELOPE_HEADER_BYTES)
  out.set(payload.bytes, ENVELOPE_HEADER_BYTES + nameBytes.length)
  return out
}

// Parses an envelope, or null if the bytes don't form a valid one.
export function unpackPayload(bytes: Uint8Array): Payload | null {
  if (bytes.length < ENVELOPE_HEADER_BYTES) return null
  const kind = bytes[0]
  if (!isPayloadKind(kind)) return null
  const nameLength = (bytes[1] << 8) | bytes[2]
  const contentStart = ENVELOPE_HEADER_BYTES + nameLength
  if (contentStart > bytes.length) return null
  return {
    kind,
    name: decoder.decode(bytes.slice(ENVELOPE_HEADER_BYTES, contentStart)),
    bytes: bytes.slice(contentStart),
  }
}
