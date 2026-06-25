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
