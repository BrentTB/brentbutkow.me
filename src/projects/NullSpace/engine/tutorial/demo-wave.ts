import { devUnlockWeapon, startGame } from '../game-loop'
import { createEnemy, uid } from '../entities/entity-creator'
import { createMine } from '../calamities/hazards'
import { AbilityKind, CollectibleKind, EnemyKind, MovementBehavior, ShipKind } from '../types'
import type { Collectible, Enemy, GameState, Vec2 } from '../types'
import { toroidalDelta, wrapPosition } from '../math/toroid'
import { emptySpawnState } from '../world/waves'
import type { TutorialStep } from './tutorial-script'

// Power pool for the tutorial — far below a real run (100/1000) so a few
// meteorite casts (8 power each) visibly drain the bar for the "power runs low"
// beat. Sized to also cover one Black Hole (30) when the use-it beat refills it.
const TUTORIAL_POWER = 32

// Target drones placed ahead of the ship. damage 0 so the ship can never die
// mid-tutorial; speed 0 so they hold position and stay predictable. HP high
// enough that the target outlasts ally fire through the intro, so the marked
// target is still alive when the player is asked to hit it.
const DEMO_DRONE_HP = 80

// Refill drones (the "cast until power runs low" beat) get extra HP so they're
// not cleared before the player has cast a few meteorites.
const REFILL_DRONE_HP = 240

function demoDrone(pos: Vec2, hp: number): Enemy {
  const drone = createEnemy(EnemyKind.drone, pos)
  // stationary movement holds position but DECAYS a knockback bump — without it
  // (chase + speed 0) a slingshot ram sends the drone coasting forever.
  return {
    ...drone,
    hp,
    maxHp: hp,
    damage: 0,
    speed: 0,
    movementBehavior: MovementBehavior.stationary,
  }
}

// A point `along` units ahead of the ship (along forwardDir) and `side` units
// perpendicular — keeps demo drones in front of, and clear of, the ship. Wrapped
// back into world bounds so a near-edge ship still spawns on-torus.
function aheadOfShip(state: GameState, along: number, side: number): Vec2 {
  const { pos } = state.ship
  const fwd = state.forwardDir
  return wrapPosition({
    x: pos.x + fwd.x * along - fwd.y * side,
    y: pos.y + fwd.y * along + fwd.x * side,
  })
}

// Builds the guided demo wave: a fresh fighter run with a few harmless drones
// placed ahead and no wave economy. `spawn.total` stays 0 so the wave-complete
// check in updateGameState can never fire and end the tutorial early; the
// tutorial machine controls when it ends.
export function startTutorialRun(state: GameState): GameState {
  // Unlock a second ability so the swap beat has something to switch to (it
  // takes hotkey 2 / the next toolbar slot).
  const base = devUnlockWeapon(startGame(state, ShipKind.fighter), AbilityKind.blackHole)
  const enemies = [
    demoDrone(aheadOfShip(base, 200, -90), DEMO_DRONE_HP),
    demoDrone(aheadOfShip(base, 240, 0), DEMO_DRONE_HP),
    demoDrone(aheadOfShip(base, 200, 90), DEMO_DRONE_HP),
  ]
  return {
    ...base,
    enemies,
    spawn: emptySpawnState(),
    power: TUTORIAL_POWER,
    maxPower: TUTORIAL_POWER,
  }
}

function tutorialSpaceMetal(pos: Vec2): Collectible {
  return {
    id: uid(),
    kind: CollectibleKind.spaceMetal,
    pos,
    vel: { x: 0, y: 0 },
    value: 1,
    elapsed: 0,
    lifetime: 999, // persists until the player collects it during the beat
    homing: false,
  }
}

// One-shot setup applied when a beat opens (the caller fires it once per step
// transition; the guards also make it safe to re-run): drop a space metal pickup
// ahead, place a mine in the ship's flight path to fly into, or park shield regen
// so the mine's hit sticks until the player repairs it.
export function applyTutorialStepEnter(state: GameState, step: TutorialStep): GameState {
  let next = state
  if (step.spawnsMetal) {
    // Opening the collect beat clears any leftover mines from the mine beat (so
    // they don't keep peppering the ship) and drops a space metal to grab.
    const hasMetal = next.collectibles.some((c) => c.kind === CollectibleKind.spaceMetal)
    next = {
      ...next,
      hazards: [],
      collectibles: hasMetal
        ? next.collectibles
        : [...next.collectibles, tutorialSpaceMetal(aheadOfShip(next, 110, 0))],
    }
  }
  if (step.parksShieldRegen) {
    // Park regen (no auto-heal) so the mine's hit to the shield sticks until the
    // player spends space metal to repair it.
    next = { ...next, ship: { ...next.ship, shieldCooldownRemaining: 9999 } }
  }
  if (step.spawnsMine && next.hazards.length === 0) {
    // Clear enemies so the ship drifts straight ahead (no flee-orbit), then lay a
    // short row of mines across its weave so it reliably flies into one on its own
    // — the lesson being that the ship won't dodge hazards for you.
    const row = [-72, 0, 72].map((side) => createMine(aheadOfShip(next, 250, side)))
    next = { ...next, enemies: [], hazards: row }
  }
  if (step.refillsPower) {
    next = { ...next, power: next.maxPower }
  }
  return next
}

// Keeps a target on screen for the beats that need one: if the demo drones have
// been cleared, spawn a fresh (tougher) one ahead. No-op while an enemy still
// lives, so the player always has something to aim at.
export function ensureTutorialEnemy(state: GameState): GameState {
  if (state.enemies.length > 0) return state
  return { ...state, enemies: [demoDrone(aheadOfShip(state, 220, 0), REFILL_DRONE_HP)] }
}

// Nearest living enemy to the ship — the meteorite target the click beat marks
// with a reticle. Null when none remain (the beat still advances on any click).
export function pickSpotlightEnemyId(state: GameState): string | null {
  let bestId: string | null = null
  let bestDist = Infinity
  for (const e of state.enemies) {
    const { x, y } = toroidalDelta(state.ship.pos, e.pos)
    const d = x * x + y * y
    if (d < bestDist) {
      bestDist = d
      bestId = e.id
    }
  }
  return bestId
}
