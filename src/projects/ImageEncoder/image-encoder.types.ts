// Shared vocabulary for the image encoder. The numeric base doubles as the
// per-channel radix: each RGB channel stores one digit in 0..base-1.

export const Base = {
  binary: 2,
  ternary: 3,
  quaternary: 4,
} as const
export type Base = (typeof Base)[keyof typeof Base]

export const Mode = {
  encode: 'encode',
  decode: 'decode',
} as const
export type Mode = (typeof Mode)[keyof typeof Mode]

export function isBase(value: number): value is Base {
  return value === Base.binary || value === Base.ternary || value === Base.quaternary
}
