import { DASHER } from '../../data'
import { toroidalDelta } from '../math/toroid'
import { steerToward } from '../math/steering'
import { DashStage } from '../types'
import type { DasherState, Enemy, Ship, Vec2 } from '../types'

const DEFAULT_STATE: DasherState = {
  stage: DashStage.approach,
  stageTimer: 0,
  heading: { x: 1, y: 0 },
}

// A telegraphed charger. It closes on the target, stalls in a windup (the dodge
// tell), lunges along a heading locked at the windup→charge transition, then
// recovers (slow, vulnerable) and repeats. The lunge outruns any ship patrol
// speed but not a slingshot fling, so it's a dodge check, not an unavoidable hit.
// The Void Worm boss runs a parallel cycle inline — it's entangled with the boss
// runtime + segment chain, so this regular-enemy version stays separate.
export function tickDasher(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const state = enemy.dasher ?? DEFAULT_STATE
  const { x: dx, y: dy } = toroidalDelta(enemy.pos, ship.pos)
  const dist = Math.hypot(dx, dy) || 1
  const toward: Vec2 = { x: dx / dist, y: dy / dist }
  const stageTimer = state.stageTimer - dt

  if (state.stage === DashStage.approach) {
    const pos = {
      x: enemy.pos.x + toward.x * enemy.speed * dt,
      y: enemy.pos.y + toward.y * enemy.speed * dt,
    }
    const vel = { x: toward.x * enemy.speed, y: toward.y * enemy.speed }
    const dasher: DasherState =
      dist <= DASHER.triggerRange
        ? { stage: DashStage.windup, stageTimer: DASHER.windupDuration, heading: toward }
        : { ...state, heading: toward }
    return { ...enemy, pos, vel, dasher }
  }

  if (state.stage === DashStage.windup) {
    // Stall while re-aiming — the tell. A sliver of velocity along the aim keeps
    // the sprite pointed at the target (the renderer rotates by velocity).
    const vel = { x: toward.x * 0.001, y: toward.y * 0.001 }
    const dasher: DasherState =
      stageTimer <= 0
        ? { stage: DashStage.charge, stageTimer: DASHER.chargeDuration, heading: toward }
        : { stage: DashStage.windup, stageTimer, heading: toward }
    return { ...enemy, vel, dasher }
  }

  if (state.stage === DashStage.charge) {
    // Lunge while curving to track the target (capped) — a flat sidestep can't shake
    // it; you have to juke hard or slingshot clear. chargeSpeed is a fixed constant,
    // exempt from wave-speed escalation, so the lunge always stays under the slingshot
    // fling cap. Position wraps in the global per-frame pass, like every other MoveFn.
    const heading = steerToward(enemy.pos, state.heading, ship.pos, DASHER.chargeTurnRate, dt)
    const pos = {
      x: enemy.pos.x + heading.x * DASHER.chargeSpeed * dt,
      y: enemy.pos.y + heading.y * DASHER.chargeSpeed * dt,
    }
    const vel = {
      x: heading.x * DASHER.chargeSpeed,
      y: heading.y * DASHER.chargeSpeed,
    }
    const dasher: DasherState =
      stageTimer <= 0
        ? { stage: DashStage.recover, stageTimer: DASHER.recoverDuration, heading }
        : { stage: DashStage.charge, stageTimer, heading }
    return { ...enemy, pos, vel, dasher }
  }

  // recover — drift slowly back toward the target (vulnerable), then loop.
  const pos = {
    x: enemy.pos.x + toward.x * DASHER.recoverSpeed * dt,
    y: enemy.pos.y + toward.y * DASHER.recoverSpeed * dt,
  }
  const vel = { x: toward.x * DASHER.recoverSpeed, y: toward.y * DASHER.recoverSpeed }
  const dasher: DasherState =
    stageTimer <= 0
      ? { stage: DashStage.approach, stageTimer: 0, heading: toward }
      : { ...state, stageTimer }
  return { ...enemy, pos, vel, dasher }
}
