// A seeded bijection on [0, size) used to scatter payload positions across the
// whole image instead of filling channels top-to-bottom. Built from a small
// Feistel network with cycle-walking, so it needs no big lookup array — each
// position is computed on the fly, which keeps memory flat for large images.

const ROUNDS = 4

// Integer avalanche hash (a variant of the well-known "xmxmx" finalizer).
function mix(value: number): number {
  let x = value >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  return (x ^ (x >>> 16)) >>> 0
}

export interface Permutation {
  at: (index: number) => number
}

export function makePermutation(size: number, seed: number): Permutation {
  if (size <= 1) return { at: (index) => index }

  // Round up to an even bit width so the Feistel halves are equal.
  let bits = Math.ceil(Math.log2(size))
  if (bits % 2 === 1) bits += 1
  const half = bits / 2
  const mask = (1 << half) - 1
  const roundKeys: number[] = []
  for (let r = 0; r < ROUNDS; r++) roundKeys.push(mix(seed ^ Math.imul(r + 1, 0x9e3779b9)))

  const feistel = (input: number): number => {
    let left = (input >>> half) & mask
    let right = input & mask
    for (let r = 0; r < ROUNDS; r++) {
      const next = (left ^ (mix(right ^ roundKeys[r]) & mask)) >>> 0
      left = right
      right = next
    }
    return ((left << half) | right) >>> 0
  }

  return {
    at: (index) => {
      // Cycle-walk: the Feistel domain (2^bits) is at least `size`, so re-apply
      // until the result lands back inside [0, size).
      let value = feistel(index)
      while (value >= size) value = feistel(value)
      return value
    },
  }
}
