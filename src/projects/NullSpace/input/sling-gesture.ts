import type { PlayerInput, Vec2 } from '../engine/types'

// Slingshot gesture decoding — pure functions over an explicit gesture value,
// so the press/drag/release feel is testable without React or a canvas.

// Press within this world radius of the ship to "grab" it for a flick, instead
// of using the selected ability.
const SLING_GRAB_RADIUS_WORLD = 60
// Drag must exceed this (CSS px) to register as a flick — a release below it
// falls through to a normal ability tap, so enemies near the ship stay
// targetable. Charge reaches full at the max and clamps beyond.
const SLING_MIN_DRAG_PX = 14
export const SLING_MAX_DRAG_PX = 170

// An in-progress ship grab: start/current pointer pos (CSS px) plus the world
// position of the press, replayed as an ability tap when the release isn't a
// real drag.
export type SlingGesture = {
  start: Vec2
  current: Vec2
  pressWorld: Vec2
}

// A press grabs the ship when it lands within the grab radius; otherwise null
// and the press falls through to ability handling.
export function tryGrabShip(worldPos: Vec2, shipPos: Vec2, screenPos: Vec2): SlingGesture | null {
  const dx = worldPos.x - shipPos.x
  const dy = worldPos.y - shipPos.y
  if (dx * dx + dy * dy > SLING_GRAB_RADIUS_WORLD * SLING_GRAB_RADIUS_WORLD) return null
  return { start: screenPos, current: screenPos, pressWorld: worldPos }
}

export function moveGesture(gesture: SlingGesture, screenPos: Vec2): SlingGesture {
  return { ...gesture, current: screenPos }
}

// Release of a grab → a flick in the drag direction with distance-based
// charge, or — when the pointer barely moved — an ability tap at the original
// press point so enemies sitting on the ship stay targetable.
export function releaseGesture(
  gesture: SlingGesture
): { fling: NonNullable<PlayerInput['fling']> } | { tapWorld: Vec2 } {
  const dx = gesture.current.x - gesture.start.x
  const dy = gesture.current.y - gesture.start.y
  const distPx = Math.hypot(dx, dy)
  if (distPx < SLING_MIN_DRAG_PX) return { tapWorld: gesture.pressWorld }
  return {
    fling: {
      dir: { x: dx / distPx, y: dy / distPx },
      charge: Math.min(1, distPx / SLING_MAX_DRAG_PX),
    },
  }
}
