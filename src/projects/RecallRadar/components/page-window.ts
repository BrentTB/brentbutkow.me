// Sentinel for an ellipsis slot in the page window — value doubles as the runtime marker.
export const PageSlot = { gap: 'gap' } as const
export type PageSlot = (typeof PageSlot)[keyof typeof PageSlot]

// First + last + the current page ±1, with '…' gaps. A gap that would hide a single page shows that
// page instead, so you never get an ellipsis standing in for just one number.
export function pageWindow(current: number, total: number, siblings = 1): (number | PageSlot)[] {
  const range = (start: number, end: number): number[] =>
    Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i)
  if (total <= 7) return range(1, total)

  const shown = new Set<number>([1, total])
  for (let p = current - siblings; p <= current + siblings; p += 1) {
    if (p >= 1 && p <= total) shown.add(p)
  }
  const out: (number | PageSlot)[] = []
  let prev = 0
  for (const p of [...shown].sort((a, b) => a - b)) {
    if (p - prev === 2) out.push(p - 1)
    else if (p - prev > 2) out.push(PageSlot.gap)
    out.push(p)
    prev = p
  }
  return out
}
