// How much payload an image can hold, given its size, the chosen base, and
// whether the message is encrypted (encryption adds salt + iv to the header).

import { Base } from '../image-encoder.types'
import { digitCapacityToBytes } from './bit-stream'
import { channelSlots } from './codec'
import { totalHeaderBytes } from './header'

// The header is stored in base-2, so one channel holds one header bit.
export function headerSlotCount(encrypted: boolean): number {
  return totalHeaderBytes(encrypted) * 8
}

export function maxPayloadBytes(
  width: number,
  height: number,
  base: Base,
  encrypted: boolean
): number {
  const bodySlots = channelSlots(width, height) - headerSlotCount(encrypted)
  return bodySlots <= 0 ? 0 : digitCapacityToBytes(bodySlots, base)
}

export function payloadFits(
  width: number,
  height: number,
  base: Base,
  encrypted: boolean,
  payloadByteLength: number
): boolean {
  return payloadByteLength <= maxPayloadBytes(width, height, base, encrypted)
}

// Bases ordered by capacity, smallest first. A smaller base also disturbs the
// image less, so the first one that fits is the gentlest workable choice.
const baseOrder: Base[] = [Base.binary, Base.ternary, Base.quaternary]

// Smallest base whose capacity holds the payload, or null if none can.
export function smallestBaseThatFits(
  width: number,
  height: number,
  encrypted: boolean,
  payloadByteLength: number
): Base | null {
  for (const base of baseOrder) {
    if (payloadFits(width, height, base, encrypted, payloadByteLength)) return base
  }
  return null
}
