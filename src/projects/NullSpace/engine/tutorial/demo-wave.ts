import { startGame } from '../game-loop'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind, MovementBehavior, ShipKind } from '../types'
import type { Enemy, GameState, Vec2 } from '../types'
import { toroidalDelta } from '../math/toroid'

// Power pool for the tutorial — far below a real run (100/1000) so a couple of
// meteorite casts (8 power each) visibly drain the bar for the "power runs low"
// beat, and the refill is quick enough to watch.
const TUTORIAL_POWER = 24

// Target drones placed ahead of the ship. damage 0 so the ship can never die
// mid-tutorial; speed 0 so they hold position and stay predictable. HP high
// enough to outlast the ship's fire through the intro, so the marked target is
// still alive when the player is asked to hit it.
const DEMO_DRONE_HP = 80

// Refill drones (the "fire until power runs low" beat) get extra HP so the
// ship's own guns don't clear them before the player has cast a few meteorites.
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
// perpendicular — keeps demo drones in front of, and clear of, the ship.
function aheadOfShip(state: GameState, along: number, side: number): Vec2 {
  const { pos } = state.ship
  const fwd = state.forwardDir
  return {
    x: pos.x + fwd.x * along - fwd.y * side,
    y: pos.y + fwd.y * along + fwd.x * side,
  }
}

// Builds the guided demo wave: a fresh fighter run with a few harmless drones
// placed ahead and no wave economy. `totalWaveEnemies` stays 0 so the
// wave-complete check in updateGameState can never fire and end the tutorial
// early; the tutorial machine controls when it ends.
export function startTutorialRun(state: GameState): GameState {
  const base = startGame(state, ShipKind.fighter)
  const enemies = [
    demoDrone(aheadOfShip(base, 200, -90), DEMO_DRONE_HP),
    demoDrone(aheadOfShip(base, 240, 0), DEMO_DRONE_HP),
    demoDrone(aheadOfShip(base, 200, 90), DEMO_DRONE_HP),
  ]
  return {
    ...base,
    enemies,
    spawnQueue: [],
    spawnTimer: 0,
    totalWaveEnemies: 0,
    spawnedInWave: 0,
    waveTimer: 0,
    power: TUTORIAL_POWER,
    maxPower: TUTORIAL_POWER,
  }
}

// Keeps a target on screen for the beats that need one: if the ship's own fire
// has cleared the demo drones, spawn a fresh (tougher) one ahead. No-op while an
// enemy still lives, so the player always has something to shoot at.
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
