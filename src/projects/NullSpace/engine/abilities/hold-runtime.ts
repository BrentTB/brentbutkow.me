import type {
  Ability,
  Asteroid,
  Enemy,
  GameState,
  HoldRuntimeState,
  Particle,
  Vec2,
} from '../types'
import type { Camera } from '../../renderer/camera'

export type { HoldRuntimeState } from '../types'

// World-layer drawing while the hold is active (target set). The renderer
// calls these generically for every hold ability — renderBack draws beneath
// entities, renderFront on top of them.
type HoldRenderFn = (
  ctx: CanvasRenderingContext2D,
  ability: Ability,
  target: Vec2,
  state: GameState,
  camera: Camera
) => void

export const INACTIVE_HOLD_STATE: HoldRuntimeState = {
  active: false,
  timer: 0,
  target: null,
}

// Shared mutable-ish bag passed through every callback. Callbacks return a new
// bag (immutable style) so the engine can chain them. `killedEnemies` is the
// accumulator the downstream collectible/death-effect code reads from.
export type HoldBag = {
  enemies: Enemy[]
  particles: Particle[]
  power: number
  killedEnemies: Enemy[]
  // Asteroids the hold can shove (Telekinesis push / Singularity pull).
  asteroids: Asteroid[]
}

export type HoldAbilityConfig = {
  // Minimum seconds-of-power required to arm. ability.powerCost is per-second.
  armSeconds: number
  // If set, the ability drains powerCost * drainInterval every interval and
  // fires `onTick`. If unset, drains powerCost * dt every frame.
  drainInterval?: number
  // Fires every frame while active — continuous force, particle visuals.
  onFrame?: (bag: HoldBag, ability: Ability, holdPos: Vec2, dt: number) => HoldBag
  // Fires on each drain tick (tick-based abilities only).
  onTick?: (bag: HoldBag, ability: Ability, holdPos: Vec2) => HoldBag
  // Fires once on the active→inactive edge (player let go, or power ran out) at
  // the last hold position, given how many seconds the hold stayed active — for a
  // release burst that charges with hold time (Singularity's explosion).
  onRelease?: (bag: HoldBag, ability: Ability, releasePos: Vec2, heldSeconds: number) => HoldBag
  // Drawn while the hold is active — beneath / on top of entities.
  renderBack?: HoldRenderFn
  renderFront?: HoldRenderFn
}

export function runHoldAbility(params: {
  config: HoldAbilityConfig
  ability: Ability
  state: HoldRuntimeState
  requested: boolean
  holdPos: Vec2 | null
  bag: HoldBag
  dt: number
}): { state: HoldRuntimeState; bag: HoldBag } {
  const { config, ability, requested, holdPos, dt } = params
  const { state } = params
  let { bag } = params

  const wasActive = state.active
  // Deactivate, firing the release burst once on the active→inactive edge at the
  // last known hold position (current holdPos if still down, else state.target).
  // state.timer carries the accumulated active seconds for continuous abilities.
  const deactivate = (b: HoldBag): { state: HoldRuntimeState; bag: HoldBag } => {
    if (wasActive && config.onRelease) {
      const releasePos = holdPos ?? state.target
      // Only continuous holds accumulate hold-seconds in `timer`; tick-based holds
      // use it as a drain-tick countdown, so their elapsed hold time is 0 here.
      const heldSeconds = config.drainInterval === undefined ? state.timer : 0
      if (releasePos) b = config.onRelease(b, ability, releasePos, heldSeconds)
    }
    return { state: INACTIVE_HOLD_STATE, bag: b }
  }

  if (!requested || !holdPos) {
    return deactivate(bag)
  }

  let active = state.active
  let timer = state.timer
  const armCost = config.armSeconds * ability.powerCost
  if (!active && bag.power >= armCost) active = true

  if (config.drainInterval !== undefined) {
    // Tick-based (Solar Flare style)
    const perTickCost = ability.powerCost * config.drainInterval
    // Deactivate as soon as the next drain tick can't be funded. Passive power
    // regen would otherwise nudge power back above 0 between drains and let
    // the beam keep going with stuttering damage.
    if (active && bag.power < perTickCost) active = false

    if (!active) return deactivate(bag)

    if (config.onFrame) bag = config.onFrame(bag, ability, holdPos, dt)
    timer -= dt
    if (timer <= 0 && bag.power >= perTickCost) {
      bag = { ...bag, power: bag.power - perTickCost }
      timer = config.drainInterval
      if (config.onTick) bag = config.onTick(bag, ability, holdPos)
    }
    return { state: { active, timer, target: holdPos }, bag }
  }

  // Continuous (Telekinesis style) — drain every frame, no tick gating.
  if (!active) return deactivate(bag)

  const drain = ability.powerCost * dt
  bag = { ...bag, power: Math.max(0, bag.power - drain) }
  if (bag.power <= 0) return deactivate(bag)

  if (config.onFrame) bag = config.onFrame(bag, ability, holdPos, dt)
  // Continuous abilities have no drain-tick countdown, so timer accumulates the
  // active hold time — onRelease reads it to charge a hold-scaled burst.
  return { state: { active, timer: state.timer + dt, target: holdPos }, bag }
}
