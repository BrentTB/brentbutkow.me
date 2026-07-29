import { useCallback, useRef, useState } from 'react'
import { MaterialId } from './pixel-world.types'
import { FAVOURITES_KEY, MATERIAL_SLOTS } from './data'
import { MATERIALS } from './engine/materials'

/** An empty set of slots, which is also the answer to anything unreadable in storage. */
function emptySlots(): (MaterialId | null)[] {
  return Array.from({ length: MATERIAL_SLOTS }, () => null)
}

/**
 * Whether a stored value names a real material. Everything in storage came from an older build or a
 * hand-edited value, so nothing in it is trusted: an id past the end of the table would reach the renderer
 * and read colours off the end of the array.
 */
function isMaterialId(value: unknown): value is MaterialId {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MATERIALS.length
  )
}

/**
 * Reads the saved slots a slot at a time, defaulting anything missing or wrong to empty. The row is always
 * `MATERIAL_SLOTS` long whatever storage holds, so the saved row always matches the one on screen.
 */
function readSlots(): (MaterialId | null)[] {
  let stored: unknown
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY)
    stored = raw === null ? null : JSON.parse(raw)
  } catch {
    // Unreadable storage (private mode, a quota error, malformed JSON) is the same as none.
    return emptySlots()
  }

  if (!Array.isArray(stored)) return emptySlots()

  return emptySlots().map((_, index) => {
    const value: unknown = stored[index]
    return isMaterialId(value) ? value : null
  })
}

function writeSlots(slots: readonly (MaterialId | null)[]): void {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(slots))
  } catch {
    // A palette that works is worth more than a saved slot: a full or blocked store is ignored.
  }
}

export type FavouriteSlots = {
  slots: readonly (MaterialId | null)[]
  /** Drops a material into one slot, leaving the others alone. */
  assign(index: number, material: MaterialId): void
}

/**
 * The three materials kept under the swatches, held in `localStorage` so the ones a visitor reaches for
 * without looking are still there next time.
 */
export function useFavouriteSlots(): FavouriteSlots {
  const [slots, setSlots] = useState<(MaterialId | null)[]>(readSlots)
  // The write is a side effect, so it stays out of the state updater: StrictMode double-invokes updaters in
  // dev. The ref carries the latest slots so back-to-back assigns still build on each other.
  const latest = useRef(slots)
  latest.current = slots

  const assign = useCallback((index: number, material: MaterialId) => {
    const current = latest.current
    if (index < 0 || index >= current.length) return
    const next = current.map((held, at) => (at === index ? material : held))
    latest.current = next
    writeSlots(next)
    setSlots(next)
  }, [])

  return { slots, assign }
}
