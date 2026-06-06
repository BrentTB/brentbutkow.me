import { describe, it, expect, beforeEach } from 'vitest'
import { createShip, resetUid, createEnemy } from './entity-creator'
import { createInitialState, startGame, startNextWave, updateGameState } from '../game-loop'
import { ShipKind, EnemyKind, GamePhase } from '../types'
import { SpaceMetalAbilityKind, tryActivateSpaceMetalAbility } from '../spaceMetalAbilities'

const useShieldRegen = (state: Parameters<typeof tryActivateSpaceMetalAbility>[0]) =>
  tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.shieldRegen)
import { SHIP_VARIANTS, SHIELD_COOLDOWN, WORLD_SIZE } from '../../data'

beforeEach(() => {
  resetUid()
  localStorage.clear()
})

describe('createShip — per-kind stats', () => {
  it('Fighter has correct base stats', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    const base = SHIP_VARIANTS[ShipKind.fighter].stats
    expect(ship.kind).toBe(ShipKind.fighter)
    expect(ship.hp).toBe(base.maxHp)
    expect(ship.maxShield).toBe(base.maxShield)
    expect(ship.shield).toBe(base.maxShield)
    expect(ship.weaponSlots).toBe(1)
  })

  it('Interceptor has higher damage and speed than Fighter', () => {
    const fighter = createShip(ShipKind.fighter, WORLD_SIZE)
    const interceptor = createShip(ShipKind.interceptor, WORLD_SIZE)
    expect(interceptor.damage).toBeGreaterThan(fighter.damage)
    expect(interceptor.speed).toBeGreaterThan(fighter.speed)
    expect(interceptor.hp).toBeLessThan(fighter.hp)
    expect(interceptor.maxShield).toBeLessThan(fighter.maxShield)
  })

  it('Dreadnought has a much larger shield than Fighter', () => {
    const fighter = createShip(ShipKind.fighter, WORLD_SIZE)
    const dreadnought = createShip(ShipKind.dreadnought, WORLD_SIZE)
    expect(dreadnought.maxShield).toBeGreaterThan(fighter.maxShield)
    expect(dreadnought.shield).toBe(dreadnought.maxShield)
  })

  it('Carrier has 3 weapon slots', () => {
    const carrier = createShip(ShipKind.carrier, WORLD_SIZE)
    expect(carrier.weaponSlots).toBe(3)
  })

  it('all ships start with full shield', () => {
    for (const kind of Object.values(ShipKind)) {
      const ship = createShip(kind, WORLD_SIZE)
      expect(ship.shield).toBe(ship.maxShield)
      expect(ship.shieldCooldownRemaining).toBe(0)
    }
  })
})

describe('shield damage pipeline', () => {
  function makeState(overrides: Partial<ReturnType<typeof startGame>['ship']> = {}) {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Place a single drone on top of the ship
    const shipPos = state.ship.pos
    return {
      ...state,
      spawnQueue: [],
      waveTimer: 0,
      projectiles: [],
      ship: { ...state.ship, shield: 50, maxShield: 50, shieldCooldownRemaining: 0, ...overrides },
      enemies: [{ ...createEnemy(EnemyKind.drone, { x: shipPos.x, y: shipPos.y }) }],
    }
  }

  it('damage hits shield before HP', () => {
    const state = makeState()
    const before = { hp: state.ship.hp, shield: state.ship.shield }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    // Drone contact kills it; some damage lands. HP should be full, shield reduced.
    expect(next.ship.hp).toBe(before.hp)
    expect(next.ship.shield).toBeLessThan(before.shield)
  })

  it('excess damage spills to HP after shield breaks', () => {
    // Shield of 5 — drone contact damage (8) exceeds it by 3
    const state = makeState({ shield: 5, maxShield: 50 })
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(next.ship.shield).toBe(0)
    expect(next.ship.hp).toBeLessThan(state.ship.hp)
  })

  it('resets shieldCooldownRemaining on any shield hit, not just on break', () => {
    // Partial hit — shield absorbs some but is not broken
    const state = makeState({ shield: 50, maxShield: 50, shieldCooldownRemaining: 0 })
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(next.ship.shieldCooldownRemaining).toBeCloseTo(SHIELD_COOLDOWN, 0)
  })
})

describe('shield regen', () => {
  it('does not regen while cooldown is counting down', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = {
      ...state,
      phase: GamePhase.playing,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [],
      ship: {
        ...state.ship,
        shield: 10,
        maxShield: 50,
        shieldCooldownRemaining: 3,
        shieldRegen: 20,
      },
    }
    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    expect(next.ship.shield).toBe(10)
    expect(next.ship.shieldCooldownRemaining).toBeCloseTo(2.9, 5)
  })

  it('regens shield after cooldown expires', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = {
      ...state,
      phase: GamePhase.playing,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [],
      ship: {
        ...state.ship,
        shield: 10,
        maxShield: 50,
        shieldCooldownRemaining: 0,
        shieldRegen: 20,
      },
    }
    // Use dt = 0.1 (= MAX_DT) so the step isn't capped
    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    expect(next.ship.shield).toBeCloseTo(10 + 20 * 0.1, 4)
  })

  it('caps shield at maxShield', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = {
      ...state,
      phase: GamePhase.playing,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [],
      ship: {
        ...state.ship,
        shield: 49,
        maxShield: 50,
        shieldCooldownRemaining: 0,
        shieldRegen: 100,
      },
    }
    const next = updateGameState(state, 1.0, { clicks: [], selectedAbility: null })
    expect(next.ship.shield).toBe(50)
  })
})

describe('shield-regen space-metal ability', () => {
  it('fills shield to max and deducts 1 space metal', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, spaceMetal: 3, ship: { ...state.ship, shield: 5, maxShield: 50 } }
    const next = useShieldRegen(state)
    expect(next.ship.shield).toBe(50)
    expect(next.ship.shieldCooldownRemaining).toBe(0)
    expect(next.spaceMetal).toBe(2)
  })

  it('is a no-op when spaceMetal < 1', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, spaceMetal: 0, ship: { ...state.ship, shield: 5, maxShield: 50 } }
    const next = useShieldRegen(state)
    expect(next.ship.shield).toBe(5)
    expect(next.spaceMetal).toBe(0)
  })

  // Regression: pressing F with a full shield was silently spending a space metal.
  // The keyboard shortcut bypasses the HUD disabled-state check, so the guard
  // must live in the shieldRegen ability's canActivate itself.
  it('is a no-op when shield is already full', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, spaceMetal: 3, ship: { ...state.ship, shield: 50, maxShield: 50 } }
    const next = useShieldRegen(state)
    expect(next.spaceMetal).toBe(3)
    expect(next.ship.shield).toBe(50)
  })
})

// Regression: when two ship bullets are in flight and the first kills an
// enemy, the second bullet should only disappear if IT actually hits something.
// Previously the dead enemy stayed in `updatedEnemies` until the end of the
// collision pass, so a follow-up bullet flying through the same space was
// counted as a "hit" against the corpse and removed for free.
describe("projectile-enemy collision — dead enemies don't absorb extra bullets", () => {
  it('a second overlapping bullet survives when the first kills the enemy', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)

    // One drone with 1 HP — first bullet kills it in one shot.
    const shipPos = state.ship.pos
    const enemyPos = { x: shipPos.x + 50, y: shipPos.y }
    const enemy = { ...createEnemy(EnemyKind.drone, enemyPos), hp: 1 }

    // Two ship-owned projectiles overlapping the enemy. Position is the
    // enemy's pos so each individually would register a hit.
    const projA = {
      id: 'projA',
      pos: { x: enemyPos.x, y: enemyPos.y },
      vel: { x: 400, y: 0 },
      radius: 4,
      hp: 1,
      maxHp: 1,
      owner: 'ship' as const,
      damage: 10,
      lifetime: 3,
    }
    const projB = { ...projA, id: 'projB' }

    state = {
      ...state,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [enemy],
      projectiles: [projA, projB],
      // Force the ship's auto-attack onto cooldown so it doesn't spawn a
      // fresh projectile that confuses the count.
      ship: { ...state.ship, fireCooldown: 999 },
    }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    // The drone is dead. Exactly one projectile should have been consumed —
    // the corpse must NOT absorb the second bullet flying through.
    expect(next.enemies.length).toBe(0)
    const remainingShipProjectiles = next.projectiles.filter((p) => p.owner === 'ship')
    expect(remainingShipProjectiles.length).toBe(1)
  })

  it('a distant trailing bullet survives when a leading bullet kills the enemy', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)

    const shipPos = state.ship.pos
    const enemyPos = { x: shipPos.x + 200, y: shipPos.y }
    const enemy = { ...createEnemy(EnemyKind.drone, enemyPos), hp: 1 }

    // Bullet A right at the enemy (about to collide)
    const projA = {
      id: 'projA',
      pos: { x: enemyPos.x, y: enemyPos.y },
      vel: { x: 400, y: 0 },
      radius: 4,
      hp: 1,
      maxHp: 1,
      owner: 'ship' as const,
      damage: 10,
      lifetime: 3,
    }
    // Bullet B far behind, nowhere near the enemy
    const projB = { ...projA, id: 'projB', pos: { x: shipPos.x + 20, y: shipPos.y } }

    state = {
      ...state,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [enemy],
      projectiles: [projA, projB],
      ship: { ...state.ship, fireCooldown: 999 },
    }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    expect(next.enemies.length).toBe(0)
    const remaining = next.projectiles.filter((p) => p.owner === 'ship')
    // Only projA should have been consumed. projB is far from any enemy.
    expect(remaining.length).toBe(1)
    expect(remaining[0].id).toBe('projB')
  })

  // The actual root cause of the bug the user reported: collision tracking
  // was keyed by projectile.id (a string). HMR resetting the uid counter
  // mid-game (or any other source of duplicate ids) meant that when one bullet
  // hit, the filter removed EVERY bullet sharing that id — even ones nowhere
  // near an enemy. Reference-based tracking is immune to id collisions.
  it('two bullets sharing the same id but in different positions: only the hitter is removed', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)

    const shipPos = state.ship.pos
    const enemyPos = { x: shipPos.x + 200, y: shipPos.y }
    const enemy = { ...createEnemy(EnemyKind.drone, enemyPos), hp: 1 }

    const projA = {
      id: 'duplicate',
      pos: { x: enemyPos.x, y: enemyPos.y },
      vel: { x: 400, y: 0 },
      radius: 4,
      hp: 1,
      maxHp: 1,
      owner: 'ship' as const,
      damage: 10,
      lifetime: 3,
    }
    // Same id, but completely different position (and not near any enemy).
    const projB = { ...projA, pos: { x: shipPos.x - 500, y: shipPos.y - 500 } }

    state = {
      ...state,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [enemy],
      projectiles: [projA, projB],
      ship: { ...state.ship, fireCooldown: 999 },
    }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    // Only projA collided. projB sits at (shipPos - 500), nowhere near any enemy.
    expect(next.enemies.length).toBe(0)
    const remaining = next.projectiles.filter((p) => p.owner === 'ship')
    expect(remaining.length).toBe(1)
    // The survivor is the one that was far away.
    expect(remaining[0].pos.x).toBeLessThan(shipPos.x)
  })

  it('a trailing bullet aimed at a DIFFERENT enemy survives', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)

    const shipPos = state.ship.pos
    // Two enemies, far apart from each other
    const enemyA = { ...createEnemy(EnemyKind.drone, { x: shipPos.x + 200, y: shipPos.y }), hp: 1 }
    const enemyB = {
      ...createEnemy(EnemyKind.drone, { x: shipPos.x, y: shipPos.y + 200 }),
      hp: 30,
    }

    const projA = {
      id: 'projA',
      pos: { x: enemyA.pos.x, y: enemyA.pos.y },
      vel: { x: 400, y: 0 },
      radius: 4,
      hp: 1,
      maxHp: 1,
      owner: 'ship' as const,
      damage: 10,
      lifetime: 3,
    }
    // Bullet B is heading toward enemyB but is mid-flight, nowhere near either enemy.
    const projB = {
      ...projA,
      id: 'projB',
      pos: { x: shipPos.x, y: shipPos.y + 80 },
      vel: { x: 0, y: 400 },
    }

    state = {
      ...state,
      spawnQueue: [],
      waveTimer: 0,
      enemies: [enemyA, enemyB],
      projectiles: [projA, projB],
      ship: { ...state.ship, fireCooldown: 999 },
    }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    // enemyA died, enemyB still alive.
    expect(next.enemies.length).toBe(1)
    const remaining = next.projectiles.filter((p) => p.owner === 'ship')
    expect(remaining.length).toBe(1)
    expect(remaining[0].id).toBe('projB')
  })
})

describe('Carrier multi-weapon attack', () => {
  it('fires at up to 3 enemies simultaneously', () => {
    let state = startGame(createInitialState(), ShipKind.carrier)
    state = startNextWave(state)
    // Place 4 enemies at close range, all within attackRange
    const shipPos = state.ship.pos
    const closePos = (offset: number) => ({ x: shipPos.x + offset, y: shipPos.y })
    const enemies = [
      { ...createEnemy(EnemyKind.drone, closePos(50)) },
      { ...createEnemy(EnemyKind.drone, closePos(60)) },
      { ...createEnemy(EnemyKind.drone, closePos(70)) },
      { ...createEnemy(EnemyKind.drone, closePos(80)) },
    ]
    state = {
      ...state,
      ship: { ...state.ship, fireCooldown: 0 },
      spawnQueue: [],
      waveTimer: 0,
      projectiles: [],
      enemies,
    }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    // Carrier (weaponSlots=3) should fire at 3 of the 4 enemies
    expect(next.projectiles.length).toBe(3)
  })

  it('Fighter fires at only 1 enemy', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const shipPos = state.ship.pos
    const closePos = (offset: number) => ({ x: shipPos.x + offset, y: shipPos.y })
    const enemies = [
      { ...createEnemy(EnemyKind.drone, closePos(50)) },
      { ...createEnemy(EnemyKind.drone, closePos(60)) },
      { ...createEnemy(EnemyKind.drone, closePos(70)) },
    ]
    state = {
      ...state,
      ship: { ...state.ship, fireCooldown: 0 },
      spawnQueue: [],
      waveTimer: 0,
      projectiles: [],
      enemies,
    }
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(next.projectiles.length).toBe(1)
  })
})
