import type { Vec2 } from '../types'
import { unitToward } from './vec'

// Turns a unit `heading` toward the direction of `target` (from `pos`) by a capped
// rate, returning the new unit heading. A charge that re-steers with this curves to
// chase its prey instead of committing to a straight line a lazy sidestep beats — but
// the cap keeps it dodgeable: out-juke the turn or slingshot clear. `turnRate` is the
// responsiveness (higher = sharper curve); the blend matches moveChase's easing. Pure.
export function steerToward(
  pos: Vec2,
  heading: Vec2,
  target: Vec2,
  turnRate: number,
  dt: number
): Vec2 {
  const desired = unitToward(pos, target)
  const alpha = 1 - Math.exp(-turnRate * dt)
  const x = heading.x + (desired.x - heading.x) * alpha
  const y = heading.y + (desired.y - heading.y) * alpha
  const m = Math.hypot(x, y) || 1
  return { x: x / m, y: y / m }
}

// Cruise along unit `dir` at `speed`, plus a sinusoidal lateral weave
// perpendicular to `dir` (so the path bends gently instead of running dead
// straight). `weave.amplitude` is the peak lateral speed; `weave.phase` is the
// accumulated weave phase in cycles. Returns the new position and the velocity
// used so callers can store `vel` for facing/render. Pure — inputs untouched.
export function driftWithWeave(
  pos: Vec2,
  dir: Vec2,
  speed: number,
  weave: { amplitude: number; phase: number },
  dt: number
): { pos: Vec2; vel: Vec2 } {
  // Perpendicular to `dir` (rotated +90°): for dir={0,1} this is the X axis.
  const perpX = -dir.y
  const perpY = dir.x
  const lateral = weave.amplitude * Math.cos(weave.phase * Math.PI * 2)
  const velX = dir.x * speed + perpX * lateral
  const velY = dir.y * speed + perpY * lateral
  return {
    pos: { x: pos.x + velX * dt, y: pos.y + velY * dt },
    vel: { x: velX, y: velY },
  }
}
