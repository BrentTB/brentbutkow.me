// Reversible conversion between a byte buffer and a base-N digit sequence.
// An image channel holds one digit, so this is how payload bytes become the
// digits an image stores. Powers of two slice cleanly (log2(base) bits per
// digit); other bases pack a fixed block of bits into a block of digits, sized
// so 2^bitsPerBlock <= base^digitsPerBlock and every block round-trips exactly.

export interface BlockRatio {
  bitsPerBlock: number
  digitsPerBlock: number
}

// Keep a block within signed-32-bit range so the bit shifts below stay exact.
const MAX_BLOCK_BITS = 24

export function blockRatio(base: number): BlockRatio {
  if (!Number.isInteger(base) || base < 2) {
    throw new RangeError(`base must be an integer >= 2, got ${base}`)
  }
  if ((base & (base - 1)) === 0) {
    return { bitsPerBlock: Math.log2(base), digitsPerBlock: 1 }
  }
  // Search digit-block sizes for the best bits-per-digit packing density.
  let best: BlockRatio = { bitsPerBlock: 1, digitsPerBlock: 1 }
  let bestDensity = 1
  let pow = base
  for (let digits = 1; pow <= Number.MAX_SAFE_INTEGER; digits++) {
    let bits = 0
    while (2 ** (bits + 1) <= pow) bits++
    if (bits <= MAX_BLOCK_BITS && bits / digits > bestDensity) {
      best = { bitsPerBlock: bits, digitsPerBlock: digits }
      bestDensity = bits / digits
    }
    if (pow > Number.MAX_SAFE_INTEGER / base) break
    pow *= base
  }
  return best
}

export function bytesToDigits(bytes: Uint8Array, base: number): number[] {
  const { bitsPerBlock, digitsPerBlock } = blockRatio(base)
  const totalBits = bytes.length * 8
  const digits: number[] = []
  const block = new Array<number>(digitsPerBlock)
  for (let bitIndex = 0; bitIndex < totalBits; bitIndex += bitsPerBlock) {
    let value = 0
    for (let b = 0; b < bitsPerBlock; b++) {
      const at = bitIndex + b
      value = (value << 1) | (at < totalBits ? getBit(bytes, at) : 0)
    }
    let remaining = value
    for (let d = digitsPerBlock - 1; d >= 0; d--) {
      block[d] = remaining % base
      remaining = Math.floor(remaining / base)
    }
    for (let d = 0; d < digitsPerBlock; d++) digits.push(block[d])
  }
  return digits
}

export function digitsToBytes(digits: number[], base: number, byteLength: number): Uint8Array {
  const { bitsPerBlock, digitsPerBlock } = blockRatio(base)
  const out = new Uint8Array(byteLength)
  const totalBits = byteLength * 8
  let bitIndex = 0
  for (
    let i = 0;
    i + digitsPerBlock <= digits.length && bitIndex < totalBits;
    i += digitsPerBlock
  ) {
    let value = 0
    for (let d = 0; d < digitsPerBlock; d++) value = value * base + digits[i + d]
    for (let b = bitsPerBlock - 1; b >= 0 && bitIndex < totalBits; b--) {
      setBit(out, bitIndex, (value >> b) & 1)
      bitIndex++
    }
  }
  return out
}

// Digits needed to hold `byteCount` bytes, including the final padded block.
export function byteCountToDigits(byteCount: number, base: number): number {
  const { bitsPerBlock, digitsPerBlock } = blockRatio(base)
  return Math.ceil((byteCount * 8) / bitsPerBlock) * digitsPerBlock
}

// Whole bytes that fit in `digitCount` digits (the inverse capacity question).
export function digitCapacityToBytes(digitCount: number, base: number): number {
  const { bitsPerBlock, digitsPerBlock } = blockRatio(base)
  return Math.floor((Math.floor(digitCount / digitsPerBlock) * bitsPerBlock) / 8)
}

function getBit(bytes: Uint8Array, index: number): number {
  return (bytes[index >> 3] >> (7 - (index & 7))) & 1
}

function setBit(bytes: Uint8Array, index: number, bit: number): void {
  const byteIndex = index >> 3
  const shift = 7 - (index & 7)
  if (bit) bytes[byteIndex] |= 1 << shift
  else bytes[byteIndex] &= ~(1 << shift)
}
