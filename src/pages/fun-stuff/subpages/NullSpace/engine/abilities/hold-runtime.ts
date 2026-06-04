import type { Ability, Enemy, HoldRuntimeState, Particle, Vec2 } from '../types'

export type { HoldRuntimeState } from '../types'

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

  if (!requested || !holdPos) {
    return { state: INACTIVE_HOLD_STATE, bag }
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

    if (!active) return { state: INACTIVE_HOLD_STATE, bag }

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
  if (!active) return { state: INACTIVE_HOLD_STATE, bag }

  const drain = ability.powerCost * dt
  bag = { ...bag, power: Math.max(0, bag.power - drain) }
  if (bag.power <= 0) return { state: INACTIVE_HOLD_STATE, bag }

  if (config.onFrame) bag = config.onFrame(bag, ability, holdPos, dt)
  return { state: { active, timer: 0, target: holdPos }, bag }
}
