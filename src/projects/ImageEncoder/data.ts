import { Base } from './image-encoder.types'

export const DEFAULT_BASE: Base = Base.binary
export const ENCODED_FILENAME = 'encoded.png'

// AES-GCM appends a 16-byte authentication tag, so an encrypted payload is a
// little larger than the text — the capacity readout accounts for it.
export const AES_GCM_TAG_BYTES = 16

export interface BaseOption {
  value: Base
  label: string
  blurb: string
}

// Higher base = more room per channel, but bigger nudges to each pixel.
export const baseOptions: BaseOption[] = [
  {
    value: Base.binary,
    label: 'Binary',
    blurb: '1 bit per channel. The gentlest nudge, near impossible to spot.',
  },
  {
    value: Base.ternary,
    label: 'Ternary',
    blurb: 'About 1.5 bits per channel. More room, a little more change.',
  },
  {
    value: Base.quaternary,
    label: 'Quaternary',
    blurb: '2 bits per channel. The most room, and the most visible change.',
  },
]

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export const copy = {
  tagline:
    'Hide a secret message inside an image by nudging its colors. Drop in a photo, type your text, and download a picture that looks the same but carries your words. Everything stays in your browser.',
  taglineFun:
    "Smuggle secrets inside a picture! Tweak the colors a hair, hide your words in the pixels, and nobody's the wiser. All of it runs right here in your browser.",
  privacy: 'Your images and messages never leave your device.',
}
