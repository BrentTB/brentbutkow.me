// Fun yardsticks for "how much can this image hold?". Sizes are approximate
// plaintext byte counts for well-known works, ordered small to large. Given a
// capacity, the UI shows the largest yardstick that still fits inside it.

export interface CapacityBand {
  bytes: number
  label: string
}

export const capacityBands: CapacityBand[] = [
  { bytes: 40, label: 'a quick note' },
  { bytes: 160, label: 'a text message' },
  { bytes: 280, label: 'a tweet' },
  { bytes: 650, label: 'a Shakespearean sonnet' },
  { bytes: 2_000, label: 'a full page of a book' },
  { bytes: 6_000, label: 'a college essay' },
  { bytes: 30_000, label: 'a short story' },
  { bytes: 120_000, label: 'a novella' },
  { bytes: 270_000, label: 'The Great Gatsby' },
  { bytes: 440_000, label: 'the first Harry Potter book' },
  { bytes: 700_000, label: 'Pride and Prejudice' },
  { bytes: 1_200_000, label: 'Moby-Dick' },
  { bytes: 3_200_000, label: 'the whole of War and Peace' },
  { bytes: 4_300_000, label: 'the King James Bible' },
  { bytes: 5_500_000, label: 'the complete works of Shakespeare' },
  { bytes: 6_500_000, label: 'every Harry Potter book at once' },
]

// Largest band that fits within maxBytes, or null when even the smallest is too big.
export function largestBandWithin(maxBytes: number): CapacityBand | null {
  let match: CapacityBand | null = null
  for (const band of capacityBands) {
    if (band.bytes > maxBytes) break
    match = band
  }
  return match
}
