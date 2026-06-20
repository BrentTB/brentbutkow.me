import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  moveToShipSelection,
  rollLevelUpWeaponOffers,
  startGame,
  startNextWave,
  updateGameState,
  applyUpgradeToState,
  devUnlockWeapon,
  devGrantUltimate,
  finishUpgradeScreen,
  beginWarp,
  completeWarp,
  advanceWarp,
  advanceDeathSequence,
} from './game-loop'
import {
  createAbilities,
  createAlly,
  createDeathAnim,
  createEnemy,
  createParticle,
  createProjectile,
} from './entities/entity-creator'
import { tickEscapeMode } from './entities/ship'
import {
  AbilityKind,
  CollectibleKind,
  EffectKind,
  EnemyKind,
  EscapeModePhase,
  GamePhase,
  HazardKind,
  ProjectileOwner,
  ShipKind,
  HelperWeaponKind,
} from './types'
import { UpgradeId } from './upgrade-ids'
import { isUpgradeWave } from './upgrades'
import { BOSS_KINDS } from './bosses/index'
import {
  ANIMATION,
  ENEMY_STATS,
  HAZARD,
  POWER_DEFAULTS,
  WARP,
  WAVES_PER_LEVEL,
  WORLD_SIZE,
} from '../data'
import { TELEKINESIS, SOLAR_FLARE } from './abilities/ability-data'

beforeEach(() => {
  localStorage.clear()
})

describe('createInitialState', () => {
  it('starts in menu phase', () => {
    const state = createInitialState()
    expect(state.phase).toBe(GamePhase.menu)
    expect(state.wave).toBe(0)
    expect(state.score).toBe(0)
    expect(state.currency).toBe(0)
    expect(state.level).toBe(0)
  })
})

describe('startGame', () => {
  it('transitions to playing phase', () => {
    const initial = createInitialState()
    const started = startGame(initial, ShipKind.fighter)
    expect(started.phase).toBe(GamePhase.playing)
    expect(started.currency).toBe(0)
  })

  it('creates a ship with full health', () => {
    const state = startGame(createInitialState(), ShipKind.fighter)
    const waved = startNextWave(state)
    expect(waved.ship.hp).toBe(waved.ship.maxHp)
  })
})

describe('moveToShipSelection', () => {
  // Regression: a defeated run's enemies used to linger on the ship-select
  // background because only the phase changed.
  it('clears the previous run entities so the background is empty', () => {
    const dirty = {
      ...createInitialState(),
      enemies: [createEnemy(EnemyKind.drone, { x: 0, y: 0 })],
      particles: [createEnemy(EnemyKind.drone, { x: 0, y: 0 })].map(() => ({
        id: 'p',
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        lifetime: 1,
        elapsed: 0,
        color: '#fff',
        size: 2,
      })),
    }
    const next = moveToShipSelection(dirty)
    expect(next.phase).toBe(GamePhase.shipSelection)
    expect(next.enemies).toEqual([])
    expect(next.particles).toEqual([])
  })
})

describe('calamities — kills count but pay nothing', () => {
  // Locked rule: a mine/shockwave kill tallies and animates, but drops no score,
  // currency, or loot — so hazards can't be farmed (mirrors ship-collision kills).
  it('a mine kill increments kills without granting score, currency, or loot', () => {
    const base = startGame(createInitialState(), ShipKind.fighter)
    // A lone, near-dead enemy parked on a mine, far from the ship so only the mine
    // can reach it. calamityTimer is parked high so no shockwave erupts this step.
    const minePos = { x: base.ship.pos.x + 600, y: base.ship.pos.y }
    const enemy = { ...createEnemy(EnemyKind.drone, { ...minePos }), hp: 1 }
    const mine = {
      id: 'm',
      kind: HazardKind.mine,
      pos: { ...minePos },
      radius: HAZARD.mineRadius,
      damage: HAZARD.mineDamage,
    }
    const state = { ...base, enemies: [enemy], hazards: [mine], calamityTimer: 999 }
    const next = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    expect(next.enemies).toHaveLength(0) // the blast killed it
    expect(next.hazards).toHaveLength(0) // single-use mine consumed
    expect(next.kills).toBe(base.kills + 1) // the kill still counts
    expect(next.score).toBe(state.score) // ...but no score
    expect(next.currency).toBe(state.currency) // ...no currency
    expect(next.collectibles).toHaveLength(0) // ...no loot
  })
})

describe('wave stall-escalation timing', () => {
  // The grace clock must not run while enemies are still spawning in — it starts
  // only once the last enemy has reached the field (the spawn queue is drained).
  const input = { clicks: [], selectedAbility: null }

  it('freezes the clock while spawning, then runs it once every enemy is in', () => {
    const base = startNextWave(startGame(createInitialState(), ShipKind.fighter)) // queues wave 1

    // Still spawning: queue non-empty + spawn delay not elapsed → clock pinned at 0.
    const spawning = { ...base, spawn: { ...base.spawn, waveTimer: 5, elapsed: 0 } }
    expect(updateGameState(spawning, 0.1, input).spawn.elapsed).toBe(0)

    // Last enemy spawned (queue empty), one still alive so the wave isn't over → clock runs.
    const enemy = {
      ...createEnemy(EnemyKind.drone, { x: base.ship.pos.x + 800, y: base.ship.pos.y }),
      hp: 1000,
    }
    const spawned = {
      ...base,
      enemies: [enemy],
      spawn: {
        ...base.spawn,
        queue: [],
        spawned: base.spawn.total,
        waveTimer: 0,
        timer: 0,
        elapsed: 5,
      },
    }
    expect(updateGameState(spawned, 0.1, input).spawn.elapsed).toBeGreaterThan(5)
  })
})

describe('startNextWave', () => {
  it('increments wave and queues enemies for spawning', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    expect(state.wave).toBe(1)
    expect(state.spawn.queue.length).toBeGreaterThan(0)
    expect(state.spawn.total).toBe(state.spawn.queue.length)
    expect(state.spawn.spawned).toBe(0)
    expect(state.level).toBe(1)
  })
})

describe('startNextWave — boss selection', () => {
  it('boss wave queues the pre-rolled nextBoss last and advances the selection', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    const expected = state.bossSelection.nextBoss
    state = startNextWave({ ...state, wave: 8 })

    expect(state.wave).toBe(9)
    expect(state.spawn.queue[state.spawn.queue.length - 1]).toBe(expected)
    expect(BOSS_KINDS).toContain(state.bossSelection.nextBoss)
  })

  it('non-boss waves leave the selection untouched', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    const before = state.bossSelection
    state = startNextWave(state)
    expect(state.bossSelection).toBe(before)
  })

  it('the first boss waves of a run spawn every boss once before any repeat', () => {
    const state = startGame(createInitialState(), ShipKind.fighter)
    const consumed: EnemyKind[] = []
    let current = state
    for (let i = 0; i < BOSS_KINDS.length; i++) {
      const bossWave = (i + 1) * 9
      current = startNextWave({ ...current, wave: bossWave - 1 })
      consumed.push(current.spawn.queue[current.spawn.queue.length - 1])
    }
    expect(consumed.slice().sort()).toEqual([...BOSS_KINDS].sort())
  })
})

describe('updateGameState', () => {
  it('does nothing when not playing', () => {
    const state = createInitialState()
    const updated = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(updated.phase).toBe(GamePhase.menu)
  })

  it('regenerates ship HP when hpRegen > 0, capped at maxHp', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, ship: { ...state.ship, hp: 50, maxHp: 100, hpRegen: 10 } }
    const healed = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    expect(healed.ship.hp).toBeGreaterThan(50)
    expect(healed.ship.hp).toBeLessThanOrEqual(100)

    const full = { ...state, ship: { ...state.ship, hp: 100, maxHp: 100, hpRegen: 10 } }
    const stillFull = updateGameState(full, 0.1, { clicks: [], selectedAbility: null })
    expect(stillFull.ship.hp).toBe(100)
  })

  it('does not regenerate HP when hpRegen is 0 (default)', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, ship: { ...state.ship, hp: 50, maxHp: 100, hpRegen: 0 } }
    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    expect(next.ship.hp).toBe(50)
  })

  it('moves enemies toward ship over time', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Tick once to spawn an enemy from the queue
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(state.enemies.length).toBeGreaterThan(0)

    // Place the enemy far down the forward axis so drift doesn't dominate.
    state = {
      ...state,
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { x: state.ship.pos.x, y: state.ship.pos.y + 800 },
      })),
    }

    const enemyBefore = state.enemies[0]
    const distBefore = Math.sqrt(
      (enemyBefore.pos.x - state.ship.pos.x) ** 2 + (enemyBefore.pos.y - state.ship.pos.y) ** 2
    )

    const updated = updateGameState(state, 0.5, { clicks: [], selectedAbility: null })
    const enemyAfter = updated.enemies.find((e) => e.id === enemyBefore.id)
    if (enemyAfter) {
      const distAfter = Math.sqrt(
        (enemyAfter.pos.x - updated.ship.pos.x) ** 2 + (enemyAfter.pos.y - updated.ship.pos.y) ** 2
      )
      expect(distAfter).toBeLessThan(distBefore)
    }
  })

  // Helper: drive a run to the frame the ship dies, returning the `dying` state.
  function reachShipDeath(score = 0, highScore = 0) {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Tick to spawn enemies from queue
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    state = {
      ...state,
      score,
      highScore,
      ship: { ...state.ship, hp: 1, shield: 0 },
      enemies: state.enemies.map((e) => ({ ...e, pos: { ...state.ship.pos } })),
    }
    return updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
  }

  it('enters the dying sequence (not gameOver) when ship hp reaches 0', () => {
    const dying = reachShipDeath()
    expect(dying.phase).toBe(GamePhase.dying)
    expect(dying.deathTimer).toBeGreaterThan(0)
  })

  it('reduced motion spawns a calmer (smaller) death burst', () => {
    // Same lethal frame, only reducedMotion differs — the calm wreck must emit
    // strictly fewer particles than the full one (guards the reduced-motion gate
    // on the death burst + low-HP smoke).
    const lethal = (reducedMotion: boolean) => {
      let state = startGame(createInitialState(), ShipKind.fighter)
      state = startNextWave(state)
      state = {
        ...state,
        enemies: [],
        spawn: { ...state.spawn, queue: [] },
        ship: { ...state.ship, hp: 0, shield: 0 },
      }
      return updateGameState(state, 0.016, { clicks: [], selectedAbility: null, reducedMotion })
    }
    const calm = lethal(true)
    expect(calm.phase).toBe(GamePhase.dying)
    // Full wreck = 56 particles, calm = 10; the ~46 gap dwarfs the ±1 from the
    // rng-gated low-HP smoke, so the margin isolates the death-burst gate.
    expect(lethal(false).particles.length - calm.particles.length).toBeGreaterThan(40)
  })

  it('the dying sequence counts down, then flips to gameOver', () => {
    const dying = reachShipDeath()
    // Mid-sequence: still dying.
    const mid = advanceDeathSequence(dying, 0.1)
    expect(mid.phase).toBe(GamePhase.dying)
    expect(mid.deathTimer).toBeLessThan(dying.deathTimer)
    // Run past the full sequence duration: now gameOver.
    let s = dying
    for (let t = 0; t < ANIMATION.deathSequence + 0.1; t += 0.05) {
      s = advanceDeathSequence(s, 0.05)
    }
    expect(s.phase).toBe(GamePhase.gameOver)
  })

  it('flags a new high score only at the gameOver transition, never at the lethal hit', () => {
    // The killing frame must NOT yet flag a high score — that waits for gameOver.
    const dying = reachShipDeath(100, 50)
    expect(dying.isNewHighScore).toBe(false)

    const finishSequence = (start: ReturnType<typeof reachShipDeath>) => {
      let s = start
      for (let t = 0; t < ANIMATION.deathSequence + 0.1; t += 0.05) {
        s = advanceDeathSequence(s, 0.05)
      }
      return s
    }

    const beaten = finishSequence(dying)
    expect(beaten.phase).toBe(GamePhase.gameOver)
    expect(beaten.isNewHighScore).toBe(true)

    const tied = finishSequence(reachShipDeath(50, 50))
    expect(tied.isNewHighScore).toBe(false)
  })

  it('warps then shows the upgrade screen after completing the 3rd wave', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, wave: WAVES_PER_LEVEL, phase: GamePhase.playing }
    state = {
      ...state,
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 1, spawned: 1, waveTimer: 0 },
    }
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    expect(state.phase).toBe(GamePhase.warping) // warp first
    expect(completeWarp(state).phase).toBe(GamePhase.upgradeScreen) // then the shop
  })

  it('shows correct phase after wave completion', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = {
      ...state,
      enemies: [],
      spawn: { ...state.spawn, queue: [], spawned: state.spawn.total, waveTimer: 0 },
    }
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const expected = isUpgradeWave(state.wave) ? GamePhase.warping : GamePhase.waveComplete
    expect(state.phase).toBe(expected)
  })
})

// The progression fix lives here: on sector clear the portal spawns just ahead
// of the ship (not at a fixed far point), residual fling/escape is cancelled so
// the cutscene flight is clean, and dropped loot is banked first. A regression
// that mis-places the portal or skips the cleanup passes every advanceWarp test,
// so beginWarp needs its own guard.
describe('beginWarp', () => {
  it('spawns the portal ahead of the ship and primes the cutscene', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Mid-fling, mid-escape, with an unclaimed metal drop still on the field.
    state = {
      ...state,
      spaceMetal: 2,
      collectibles: [
        {
          id: 'drop-1',
          kind: CollectibleKind.spaceMetal,
          pos: { x: state.ship.pos.x + 500, y: state.ship.pos.y },
          vel: { x: 0, y: 0 },
          value: 3,
          elapsed: 0,
          lifetime: 12,
          homing: false,
        },
      ],
      enemies: [createEnemy(EnemyKind.drone, { x: state.ship.pos.x, y: state.ship.pos.y + 200 })],
      ship: {
        ...state.ship,
        flingVel: { x: 200, y: -50 },
        escapeMode: { phase: EscapeModePhase.dash, timer: 1, heading: { x: 1, y: 0 } },
      },
    }

    const warped = beginWarp(state)

    // Portal sits exactly WARP.spawnAhead along the forward axis from the ship.
    expect(warped.portalPos.x).toBeCloseTo(state.ship.pos.x + state.forwardDir.x * WARP.spawnAhead)
    expect(warped.portalPos.y).toBeCloseTo(state.ship.pos.y + state.forwardDir.y * WARP.spawnAhead)
    expect(warped.phase).toBe(GamePhase.warping)
    expect(warped.warpTimer).toBe(WARP.maxDuration)
    expect(warped.warpFlashTimer).toBe(0)
    // Residual fling / escape cleared so the cutscene flight is clean.
    expect(warped.ship.flingVel).toEqual({ x: 0, y: 0 })
    expect(warped.ship.escapeMode).toBeNull()
    // Field wiped and the dropped metal banked into the currency.
    expect(warped.enemies).toEqual([])
    expect(warped.collectibles).toEqual([])
    expect(warped.hazards).toEqual([])
    expect(warped.spaceMetal).toBe(2 + 3)
  })

  // Regression: helpers + the helper factory used to ride the warp into the next
  // sector (and the shop), banking a free squad. The ship teleports away alone.
  it('clears all allies on the sector-clear warp', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, allies: [createAlly({ x: 0, y: 0 }), createAlly({ x: 10, y: 0 })] }
    expect(beginWarp(state).allies).toEqual([])
  })
})

describe('advanceWarp', () => {
  const warpingState = (warpTimer: number) => ({
    ...startGame(createInitialState(), ShipKind.fighter),
    phase: GamePhase.warping,
    warpTimer,
  })

  it('flies (no flash) while the safety timer has time remaining', () => {
    const { state, landed } = advanceWarp(warpingState(1.0), 0.016)
    expect(state.phase).toBe(GamePhase.warping)
    expect(state.warpTimer).toBeCloseTo(0.984)
    expect(state.warpFlashTimer).toBe(0) // no screen effect during the flight
    expect(landed).toBe(false)
  })

  // Regression: the sim is frozen during the warp, so death bursts used to stick
  // as a frozen "star" — advanceWarp must keep cosmetic animations ticking.
  it('keeps cosmetic animations (death anims + particles) playing during the warp', () => {
    const state = {
      ...warpingState(5),
      deathAnims: [createDeathAnim(createEnemy(EnemyKind.drone, { x: 0, y: 0 }))],
      particles: [createParticle({ x: 0, y: 0 }, { x: 0, y: 0 }, '#fff', 1, 2)],
    }
    const result = advanceWarp(state, 0.1)
    expect(result.state.deathAnims[0].elapsed).toBeCloseTo(0.1)
    expect(result.state.particles[0].elapsed).toBeCloseTo(0.1)
  })

  it('begins the flash (not completion) when the flight safety timer elapses', () => {
    const { state, landed } = advanceWarp(warpingState(0.01), 0.016)
    expect(state.phase).toBe(GamePhase.warping)
    expect(state.warpFlashTimer).toBeGreaterThan(0)
    expect(landed).toBe(false)
  })

  it('is a no-op outside the warping phase', () => {
    const playing = { ...startGame(createInitialState(), ShipKind.fighter), warpTimer: 5 }
    const { state, landed } = advanceWarp(playing, 0.5)
    expect(state).toBe(playing)
    expect(state.warpTimer).toBe(5)
    expect(landed).toBe(false)
  })

  it('flies the ship toward the portal each frame', () => {
    const s = warpingState(WARP.maxDuration)
    const before = Math.hypot(s.portalPos.x - s.ship.pos.x, s.portalPos.y - s.ship.pos.y)
    const { state } = advanceWarp(s, 0.1)
    const after = Math.hypot(
      state.portalPos.x - state.ship.pos.x,
      state.portalPos.y - state.ship.pos.y
    )
    expect(after).toBeLessThan(before)
  })

  it('starts the flash (not completion) when the ship reaches the portal', () => {
    const s = warpingState(WARP.maxDuration)
    // Park the ship right on the portal → the flash begins this frame.
    const atPortal = { ...s, ship: { ...s.ship, pos: { ...s.portalPos } } }
    const { state, landed } = advanceWarp(atPortal, 0.016)
    expect(landed).toBe(false)
    expect(state.phase).toBe(GamePhase.warping)
    expect(state.warpFlashTimer).toBeCloseTo(WARP.flashDuration)
  })

  it('completes into the upgrade screen once the flash elapses', () => {
    const s = { ...warpingState(WARP.maxDuration), warpFlashTimer: 0.01 }
    const { state, landed } = advanceWarp(s, 0.05)
    expect(landed).toBe(true)
    expect(state.phase).toBe(GamePhase.upgradeScreen)
  })
})

describe('applyUpgradeToState', () => {
  it('deducts currency and upgrades ability', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, currency: 50 }
    const before = state.currency
    const upgraded = applyUpgradeToState(state, UpgradeId.meteoriteDamage)
    expect(upgraded.currency).toBeLessThan(before)
    expect(upgraded.upgrades[UpgradeId.meteoriteDamage].currentTier).toBe(1)
  })

  it('does nothing when insufficient currency', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, currency: 0 }
    const upgraded = applyUpgradeToState(state, UpgradeId.meteoriteDamage)
    expect(upgraded.currency).toBe(0)
    expect(upgraded.upgrades[UpgradeId.meteoriteDamage].currentTier).toBe(0)
  })

  it('unlocking meteor makes it usable', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, currency: 50 }
    const upgraded = applyUpgradeToState(state, UpgradeId.unlockMeteor)
    const meteor = upgraded.abilities.find((a) => a.kind === AbilityKind.meteor)
    expect(meteor!.unlocked).toBe(true)
  })

  it('assigns unlockedAt in unlock order; once set, the index stays stable', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = { ...state, currency: 1000 }
    // Meteorite always 0.
    const meteorite = state.abilities.find((a) => a.kind === AbilityKind.meteorite)
    expect(meteorite!.unlockedAt).toBe(0)

    // Unlock rocket → 1.
    state = applyUpgradeToState(state, UpgradeId.unlockRocket)
    expect(state.abilities.find((a) => a.kind === AbilityKind.rocket)!.unlockedAt).toBe(1)

    // Unlock black hole → 2.
    state = applyUpgradeToState(state, UpgradeId.unlockBlackHole)
    expect(state.abilities.find((a) => a.kind === AbilityKind.blackHole)!.unlockedAt).toBe(2)

    // Unlock meteor → 3. Rocket and black hole stay at 1 and 2.
    state = applyUpgradeToState(state, UpgradeId.unlockMeteor)
    expect(state.abilities.find((a) => a.kind === AbilityKind.meteor)!.unlockedAt).toBe(3)
    expect(state.abilities.find((a) => a.kind === AbilityKind.rocket)!.unlockedAt).toBe(1)
    expect(state.abilities.find((a) => a.kind === AbilityKind.blackHole)!.unlockedAt).toBe(2)

    // A non-unlock modifier purchase doesn't disturb existing indices.
    state = applyUpgradeToState(state, UpgradeId.meteoriteDamage)
    expect(state.abilities.find((a) => a.kind === AbilityKind.rocket)!.unlockedAt).toBe(1)
  })
})

describe('dev unlock helpers', () => {
  it('devUnlockWeapon unlocks a locked base ability (no cost)', () => {
    const state = createInitialState()
    expect(state.abilities.find((a) => a.kind === AbilityKind.meteor)!.unlocked).toBe(false)
    const next = devUnlockWeapon(state, AbilityKind.meteor)
    expect(next.abilities.find((a) => a.kind === AbilityKind.meteor)!.unlocked).toBe(true)
  })

  it('devGrantUltimate grants the ultimate and unlocks its row (no cost)', () => {
    const next = devGrantUltimate(createInitialState(), AbilityKind.meteorite)
    expect(next.ultimatesOwned).toContain(AbilityKind.cometShower)
    expect(next.abilities.find((a) => a.kind === AbilityKind.cometShower)!.unlocked).toBe(true)
  })

  it('devGrantUltimate is a no-op for an ability without an ultimate', () => {
    // Every base now offers an ultimate, so the no-op case is an ultimate itself.
    const state = createInitialState()
    expect(devGrantUltimate(state, AbilityKind.cometShower)).toBe(state)
  })
})

describe('rollLevelUpWeaponOffers', () => {
  // Regression: ultimate rows start locked, so they used to be eligible as
  // level-up weapon offers — but ultimates are bought via the shard economy and
  // must never appear in the unlock offers.
  it('never offers ultimate abilities', () => {
    const offers = rollLevelUpWeaponOffers(createAbilities(), 99, { count: 99 })
    expect(offers).not.toContain(AbilityKind.cometShower)
    expect(offers).not.toContain(AbilityKind.meteorShower)
    expect(offers.length).toBeGreaterThan(0)
  })
})

describe('levelUpWeaponOffers', () => {
  function reachUpgradeScreen(state: ReturnType<typeof createInitialState>) {
    // Force the state into the wave-complete branch that triggers
    // GamePhase.upgradeScreen. Easiest path: jump to a wave that is a
    // multiple of WAVES_PER_LEVEL, wipe enemies/queue, then tick once.
    state = startGame(state, ShipKind.fighter)
    state = startNextWave(state)
    state = {
      ...state,
      wave: WAVES_PER_LEVEL,
      level: 1,
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 1, spawned: 1 },
    }
    // Clearing an upgrade wave warps first; completing the warp opens the shop
    // (which is where the offers are rolled).
    const cleared = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.meteorite,
      holdPos: null,
      isHolding: false,
    })
    return completeWarp(cleared)
  }

  it('rolls 2 distinct locked-weapon offers on entering upgrade screen', () => {
    const state = reachUpgradeScreen(createInitialState())
    expect(state.phase).toBe(GamePhase.upgradeScreen)
    expect(state.levelUpWeaponOffers.length).toBe(2)
    expect(new Set(state.levelUpWeaponOffers).size).toBe(2)
    for (const kind of state.levelUpWeaponOffers) {
      const ability = state.abilities.find((a) => a.kind === kind)!
      expect(ability.unlocked).toBe(false)
    }
  })

  it('purchasing one of the offered unlocks clears all offers', () => {
    let state = reachUpgradeScreen(createInitialState())
    const offered = state.levelUpWeaponOffers[0]
    const unlockId = (
      {
        [AbilityKind.meteor]: UpgradeId.unlockMeteor,
        [AbilityKind.blackHole]: UpgradeId.unlockBlackHole,
        [AbilityKind.rocket]: UpgradeId.unlockRocket,
        [AbilityKind.shield]: UpgradeId.unlockShield,
        [AbilityKind.sun]: UpgradeId.unlockSun,
        [AbilityKind.helper]: UpgradeId.unlockHelper,
        [AbilityKind.telekinesis]: UpgradeId.unlockTelekinesis,
        [AbilityKind.solarFlare]: UpgradeId.unlockSolarFlare,
      } as Partial<Record<AbilityKind, UpgradeId>>
    )[offered]!
    state = { ...state, currency: 1000 }
    state = applyUpgradeToState(state, unlockId)
    expect(state.levelUpWeaponOffers).toEqual([])
    expect(state.abilities.find((a) => a.kind === offered)!.unlocked).toBe(true)
  })

  it('purchasing a non-offered upgrade leaves offers intact', () => {
    let state = reachUpgradeScreen(createInitialState())
    const before = [...state.levelUpWeaponOffers]
    state = { ...state, currency: 1000 }
    state = applyUpgradeToState(state, UpgradeId.shipMaxHp)
    expect(state.levelUpWeaponOffers).toEqual(before)
  })
})

describe('helper weapons in GameState', () => {
  it('starts a run with only bullet unlocked', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    expect(state.unlockedWeapons).toEqual([HelperWeaponKind.bullet])
  })

  it('buying a helper-weapon unlock pushes the kind into unlockedWeapons', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, currency: 1000 }
    state = applyUpgradeToState(state, UpgradeId.unlockLaser)
    expect(state.unlockedWeapons).toContain(HelperWeaponKind.laser)
  })

  it('buying the same unlock twice does not duplicate the kind in unlockedWeapons', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, currency: 1000 }
    state = applyUpgradeToState(state, UpgradeId.unlockLaser)
    // applyUpgradeToState rejects a second purchase past the single tier, but
    // we still want the array stable if it ever ran twice.
    const beforeCount = state.unlockedWeapons.filter((k) => k === HelperWeaponKind.laser).length
    state = applyUpgradeToState(state, UpgradeId.unlockLaser)
    const afterCount = state.unlockedWeapons.filter((k) => k === HelperWeaponKind.laser).length
    expect(afterCount).toBe(beforeCount)
  })
})

// These tests catch a class of bugs where updateGameState mutates a local
// variable but forgets to thread it through the returned state. `...state`
// in the return statement silently provides every required GameState field,
// so TypeScript can't detect a missing field — only behavioral tests can.
// Any future scalar/array field added to GameState that is locally mutated
// inside updateGameState should get a similar test below.
describe('updateGameState — state field round-trip persistence', () => {
  function injectCollectible(
    state: ReturnType<typeof createInitialState>,
    collectible: ReturnType<typeof createInitialState>['collectibles'][number]
  ) {
    return { ...state, collectibles: [...state.collectibles, collectible] }
  }

  it('clicking on space metal increments state.spaceMetal in the returned state', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'metal-1',
      kind: CollectibleKind.spaceMetal,
      pos: { ...state.ship.pos },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    const before = state.spaceMetal
    state = updateGameState(state, 1 / 60, {
      clicks: [{ ...state.ship.pos }],
      selectedAbility: null,
    })

    expect(state.spaceMetal).toBe(before + 1)
  })

  it('clicked space metal is removed from state.collectibles in the returned state', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'metal-1',
      kind: CollectibleKind.spaceMetal,
      pos: { ...state.ship.pos },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    state = updateGameState(state, 1 / 60, {
      clicks: [{ ...state.ship.pos }],
      selectedAbility: null,
    })

    expect(state.collectibles.find((c) => c.id === 'metal-1')).toBeUndefined()
  })

  it('state.spaceMetal persists across many frames after being incremented', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'metal-1',
      kind: CollectibleKind.spaceMetal,
      pos: { ...state.ship.pos },
      vel: { x: 0, y: 0 },
      value: 1,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    state = updateGameState(state, 1 / 60, {
      clicks: [{ ...state.ship.pos }],
      selectedAbility: null,
    })
    expect(state.spaceMetal).toBe(1)

    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }
    expect(state.spaceMetal).toBe(1)
  })

  it('power orb at the ship is consumed: removed from collectibles, power increases', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, power: 50 }
    state = injectCollectible(state, {
      id: 'orb-1',
      kind: CollectibleKind.powerOrb,
      pos: { x: state.ship.pos.x, y: state.ship.pos.y },
      vel: { x: 0, y: 0 },
      value: 10,
      elapsed: 1,
      lifetime: 12,
      homing: true,
    })

    state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    expect(state.collectibles.find((c) => c.id === 'orb-1')).toBeUndefined()
    expect(state.power).toBeGreaterThan(50)
  })

  it('uncollected power orbs remain in state.collectibles across frames', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = injectCollectible(state, {
      id: 'far-orb',
      kind: CollectibleKind.powerOrb,
      pos: { x: 50, y: 50 },
      vel: { x: 0, y: 0 },
      value: 5,
      elapsed: 0,
      lifetime: 12,
      homing: false,
    })

    state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(state.collectibles.find((c) => c.id === 'far-orb')).toBeDefined()
  })

  it('manually-set spaceMetal value is preserved through a tick (no clicks)', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, spaceMetal: 7 }

    state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(state.spaceMetal).toBe(7)
  })

  it('state.bossSelection survives many frames unchanged', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const sentinel = { nextBoss: EnemyKind.phaseShifter, pool: [EnemyKind.voidWorm] }
    state = { ...state, bossSelection: sentinel }

    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }
    expect(state.bossSelection).toEqual(sentinel)
  })

  it('scalar field invariant: spaceMetal only increases when a metal is collected', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, spaceMetal: 3 }

    // 60 frames of idle play — no metal clicks, no metal in state
    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.spaceMetal).toBe(3)
  })

  it('array field invariant: collectibles spawned by kills appear in the returned state', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    // The ship no longer auto-attacks, so kill an enemy with a Meteorite. Keep it
    // far and stationary so the strike lands reliably and the dropped orb stays
    // uncollected in state.collectibles.
    if (state.enemies.length > 0) {
      const target = state.enemies[0]
      const enemyPos = { x: state.ship.pos.x + 600, y: state.ship.pos.y }
      state = { ...state, enemies: [{ ...target, hp: 1, speed: 0, spawnIn: 0, pos: enemyPos }] }

      // Cast Meteorite at the enemy, then tick past its strike delay + orb spawn.
      state = updateGameState(state, 0.05, {
        clicks: [enemyPos],
        selectedAbility: AbilityKind.meteorite,
      })
      for (let i = 0; i < 15; i++) {
        state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
      }

      expect(state.collectibles.length).toBeGreaterThan(0)
      expect(state.score).toBeGreaterThan(0)
    }
  })

  it('state.kills increments when an enemy is destroyed, alongside score', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    if (state.enemies.length > 0) {
      const target = state.enemies[0]
      const enemyPos = { x: state.ship.pos.x + 600, y: state.ship.pos.y }
      // One stationary, 1-HP enemy; kill it with a Meteorite and tick past the strike.
      state = {
        ...state,
        kills: 0,
        score: 0,
        enemies: [{ ...target, hp: 1, speed: 0, spawnIn: 0, pos: enemyPos }],
      }
      state = updateGameState(state, 0.05, {
        clicks: [enemyPos],
        selectedAbility: AbilityKind.meteorite,
      })
      for (let i = 0; i < 15; i++) {
        state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
      }

      expect(state.kills).toBe(1)
      expect(state.score).toBeGreaterThan(0)
    }
  })

  it('state.kills stays put across idle frames where nothing dies', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Empty field + totalWaveEnemies 0 keeps it playing with nothing to kill.
    state = {
      ...state,
      kills: 5,
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 0, waveTimer: 0 },
    }
    for (let i = 0; i < 30; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }
    expect(state.kills).toBe(5)
  })

  // Regression: the wave-complete early-return spread `...state` but forgot to
  // thread `escapeTrailAccumulator`, so the frame's escape-trail update was lost
  // whenever a wave ended mid-dash. The dash tick advances the accumulator, so a
  // returned value of 0 (the stale frame-start value) means the field was dropped.
  it('escapeTrailAccumulator threads through the wave-complete early return', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Ship mid-dash so tickEscapeMode advances the accumulator this frame.
    state = {
      ...state,
      phase: GamePhase.playing,
      escapeTrailAccumulator: 0,
      ship: {
        ...state.ship,
        escapeMode: { phase: EscapeModePhase.dash, timer: 1, heading: { x: 1, y: 0 } },
      },
      // Force the wave-complete branch: nothing left to spawn or fight.
      wave: 1,
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 1, spawned: 1 },
    }

    const dt = 0.016
    const expected = tickEscapeMode(state.ship, dt, state.escapeTrailAccumulator).trailAccumulator
    expect(expected).toBeGreaterThan(0) // guards against a vacuous test

    state = updateGameState(state, dt, { clicks: [], selectedAbility: null })

    expect(state.phase).toBe(GamePhase.waveComplete)
    expect(state.escapeTrailAccumulator).toBeCloseTo(expected)
  })

  it('waveElapsed accumulates dt across frames in the returned state', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // The escalation clock only runs once the wave is fully spawned, so drain the
    // queue; keep one enemy alive (far off) so the wave stays in play across frames.
    const enemy = {
      ...createEnemy(EnemyKind.drone, { x: state.ship.pos.x + 800, y: state.ship.pos.y }),
      hp: 1000,
    }
    state = {
      ...state,
      enemies: [enemy],
      spawn: { ...state.spawn, queue: [], spawned: state.spawn.total, waveTimer: 0 },
    }

    const dt = 1 / 60
    const before = state.spawn.elapsed
    for (let i = 0; i < 3; i++) {
      state = updateGameState(state, dt, { clicks: [], selectedAbility: null })
    }

    expect(state.spawn.elapsed).toBeCloseTo(before + 3 * dt)
  })

  // Companion to escapeTrailAccumulator: waveElapsed is incremented before the
  // wave-complete early return, so that branch must thread the frame's increment
  // too — a `...state` spread would silently emit the stale frame-start value.
  it('waveElapsed threads through the wave-complete early return', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Force the wave-complete branch: nothing left to spawn or fight; mid-sector
    // wave (1) returns directly without warping.
    state = {
      ...state,
      phase: GamePhase.playing,
      wave: 1,
      enemies: [],
      spawn: { ...state.spawn, elapsed: 5, queue: [], total: 1, spawned: 1 },
    }

    const dt = 0.016
    state = updateGameState(state, dt, { clicks: [], selectedAbility: null })

    expect(state.phase).toBe(GamePhase.waveComplete)
    expect(state.spawn.elapsed).toBeCloseTo(5 + dt)
  })
})

// moveChase smooths velocity toward the chase target. The tank's chase vector
// would otherwise flip every frame because the ship is on a Lissajous patrol
// that reverses direction frequently. These tests guard the smoothing — a
// regression to "snap velocity each frame" would produce instant 180° flips.
describe('updateGameState — chase-movement smoothing (tank behaviour)', () => {
  it('a chasing enemy moves toward the ship over one tick', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    state = {
      ...state,
      enemies: state.enemies.map((e) => ({
        ...e,
        pos: { x: state.ship.pos.x, y: state.ship.pos.y + 800 },
        vel: { x: 0, y: 0 },
      })),
    }

    const distBefore = Math.abs(state.enemies[0].pos.y - state.ship.pos.y)
    const next = updateGameState(state, 0.5, { clicks: [], selectedAbility: null })
    const after = next.enemies.find((e) => e.id === state.enemies[0].id)
    if (after) {
      const distAfter = Math.abs(after.pos.y - next.ship.pos.y)
      expect(distAfter).toBeLessThan(distBefore)
    }
  })

  it('chase velocity does not snap to the new target in a single frame', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    // A drone (chase movement) moving right (+x) at full speed, ship to the LEFT.
    // Explicit drone — wave 1 can also spawn a dasher, which uses dash movement,
    // not the chase smoothing this test measures.
    const chaser = {
      ...createEnemy(EnemyKind.drone, { x: state.ship.pos.x + 200, y: state.ship.pos.y }),
      speed: 40,
      vel: { x: 40, y: 0 },
    }
    state = { ...state, enemies: [chaser] }

    const next = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const after = next.enemies.find((e) => e.id === chaser.id)
    // After ONE frame: chase target is -40 (ship is to the left). Without
    // smoothing the snapped vel would be -40 exactly. With smoothing it's
    // between the old (+40) and the target (-40) — i.e. closer to +40 than
    // to -40 for a slow turn rate.
    if (after) {
      expect(after.vel.x).toBeGreaterThan(-40)
      expect(after.vel.x).toBeLessThan(40)
      // Slow enemy (speed=40) → turn rate = 40/30 ≈ 1.33/s →
      // alpha at dt=0.016 ≈ 0.021. Expected vel ≈ 40 + (-40-40)*0.021 ≈ 38.3.
      // Just assert it's still strongly positive (didn't flip).
      expect(after.vel.x).toBeGreaterThan(0)
    }
  })

  it('a faster enemy turns more quickly than a slower one', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })

    // Explicitly a drone (chase movement). Wave 1 can also spawn a dasher, which
    // uses dash movement, not the smoothed chase turn-rate this test measures.
    const baseEnemy = createEnemy(EnemyKind.drone, {
      x: state.ship.pos.x + 200,
      y: state.ship.pos.y,
    })
    const slowState = {
      ...state,
      enemies: [
        {
          ...baseEnemy,
          id: 'slow',
          speed: 40,
          pos: { x: state.ship.pos.x + 200, y: state.ship.pos.y },
          vel: { x: 40, y: 0 },
        },
      ],
    }
    const fastState = {
      ...state,
      enemies: [
        {
          ...baseEnemy,
          id: 'fast',
          speed: 150,
          pos: { x: state.ship.pos.x + 200, y: state.ship.pos.y },
          vel: { x: 150, y: 0 },
        },
      ],
    }

    const slowAfter = updateGameState(slowState, 0.05, { clicks: [], selectedAbility: null })
    const fastAfter = updateGameState(fastState, 0.05, { clicks: [], selectedAbility: null })

    // Both started at +speed; target is -speed. Fast enemy should have rotated
    // its velocity further toward the negative direction than the slow one,
    // i.e. velMagOverSpeedRatio is lower (more turned) for the fast enemy.
    const slowAt = slowAfter.enemies.find((e) => e.id === 'slow')
    const fastAt = fastAfter.enemies.find((e) => e.id === 'fast')
    if (slowAt && fastAt) {
      const slowRatio = slowAt.vel.x / 40
      const fastRatio = fastAt.vel.x / 150
      // slowRatio still ~+0.93, fastRatio ~+0.78 — fast turned more.
      expect(fastRatio).toBeLessThan(slowRatio)
    }
  })
})

// updateGameState relies on phase-gating to halt the game when paused. These
// tests guard that a paused game truly stops simulating — no enemy spawns,
// no collectible collection, no power regen, no projectiles moving — so any
// future refactor that bypasses the phase guard is caught immediately.
describe('updateGameState — paused phase halts simulation', () => {
  it('returns the same state object unchanged when phase === paused', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, phase: GamePhase.paused }

    const result = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    expect(result).toBe(state)
  })

  it('queued enemies do not spawn while paused', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const queueBefore = state.spawn.queue.length
    state = { ...state, phase: GamePhase.paused, spawn: { ...state.spawn, waveTimer: 0 } }

    for (let i = 0; i < 240; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.spawn.queue.length).toBe(queueBefore)
    expect(state.enemies.length).toBe(0)
    expect(state.spawn.spawned).toBe(0)
  })

  it('power orbs at the ship are not collected while paused', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = {
      ...state,
      phase: GamePhase.paused,
      power: 50,
      collectibles: [
        {
          id: 'orb-paused',
          kind: CollectibleKind.powerOrb,
          pos: { x: state.ship.pos.x, y: state.ship.pos.y },
          vel: { x: 0, y: 0 },
          value: 10,
          elapsed: 1,
          lifetime: 12,
          homing: true,
        },
      ],
    }

    for (let i = 0; i < 30; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.power).toBe(50)
    expect(state.collectibles.find((c) => c.id === 'orb-paused')).toBeDefined()
  })

  it('does not regenerate power while paused', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, phase: GamePhase.paused, power: 100 }

    for (let i = 0; i < 60; i++) {
      state = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    }

    expect(state.power).toBe(100)
  })
})

// The wave delay (waveTimer > 0) is meant to delay the FIRST enemy spawn of
// the next wave — not to freeze the whole simulation. These tests guard that
// in-flight effects and collectibles keep moving through the delay, so e.g.
// a meteor launched at the end of one wave still descends and detonates
// during the run-up to the next wave.
describe('updateGameState — wave delay only gates spawning', () => {
  it('in-flight meteor strikes keep advancing during the wave delay', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    // Construct a state mimicking the moment right after "Next Wave": waveTimer
    // is positive (1s for wave 2+), an effect is in flight from the prior wave.
    state = {
      ...state,
      wave: 2,
      spawn: { ...state.spawn, waveTimer: 1 },
      activeEffects: [
        {
          id: 'mid-flight-meteor',
          kind: EffectKind.meteorStrike,
          pos: { x: 1500, y: 1500 },
          elapsed: 0,
          duration: 0.5,
          delay: 0.5,
          damage: 60,
          aoeRadius: 100,
        },
      ],
    }

    const before = state.activeEffects[0].elapsed
    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    const after = next.activeEffects.find((e) => e.id === 'mid-flight-meteor')
    expect(after).toBeDefined()
    expect(after!.elapsed).toBeGreaterThan(before)
  })

  it('power orbs in flight keep homing during the wave delay', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = {
      ...state,
      wave: 2,
      spawn: { ...state.spawn, waveTimer: 1 },
      collectibles: [
        {
          id: 'mid-flight-orb',
          kind: CollectibleKind.powerOrb,
          pos: { x: state.ship.pos.x + 50, y: state.ship.pos.y },
          vel: { x: -50, y: 0 },
          value: 5,
          elapsed: 1,
          lifetime: 12,
          homing: true,
        },
      ],
    }

    const before = state.collectibles[0].pos.x
    const next = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    const after = next.collectibles.find((c) => c.id === 'mid-flight-orb')
    if (after) {
      expect(after.pos.x).toBeLessThan(before)
    } else {
      // Acceptable: orb may have been collected this frame
      expect(next.power).toBeGreaterThan(state.power)
    }
  })

  it('the wave delay still prevents enemies from spawning', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, wave: 2, spawn: { ...state.spawn, waveTimer: 1, timer: 0 } }
    const queueBefore = state.spawn.queue.length

    const next = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })

    expect(next.spawn.queue.length).toBe(queueBefore)
    expect(next.enemies.length).toBe(0)
    expect(next.spawn.spawned).toBe(0)
  })

  it('the wave timer decrements down to zero', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = { ...state, wave: 2, spawn: { ...state.spawn, waveTimer: 0.5 } }

    const next = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
    expect(next.spawn.waveTimer).toBeCloseTo(0.4, 5)
  })
})

// The bomber's defining mechanic is its on-death explosion. It must fire on
// EVERY death path — including the most common one, dying by ramming the ship
// (handled by resolveEnemyShipCollisions, separate from ability/projectile
// kills). A regression here would silently reduce the bomber to its trivial
// contact damage.
describe('updateGameState — bomber explodes on death (including by ramming)', () => {
  it('a bomber killed by ramming the ship deals its explosion AoE, not just contact', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)

    const shipPos = state.ship.pos
    // A bomber sitting on the ship with effectively unkillable HP, so the only
    // way it leaves this frame is by ramming — exercising the ship-collision
    // death path (not the projectile/ability paths).
    state = {
      ...state,
      spawn: { ...state.spawn, queue: [], waveTimer: 0 },
      projectiles: [],
      enemies: [{ ...createEnemy(EnemyKind.bomber, { x: shipPos.x, y: shipPos.y }), hp: 100000 }],
    }

    const before = state.ship.hp + state.ship.shield
    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })

    // The bomber is destroyed by the ram...
    expect(next.enemies.some((e) => e.kind === EnemyKind.bomber)).toBe(false)
    // ...and the ship took at least the explosion AoE on top of contact damage.
    // Pre-fix this path skipped resolveDeathEffects, so hpLost was only the
    // bomber's contact damage (well under explosionDamage).
    const hpLost = before - (next.ship.hp + next.ship.shield)
    expect(hpLost).toBeGreaterThanOrEqual(ENEMY_STATS.bomber.explosionDamage)
  })
})

// Swarm enemies weave side-to-side. That oscillation must be driven by the
// enemy's own (speed-scaled) age — game time — not the wall clock, so it stays
// deterministic, testable, and in sync with the game-speed setting. A
// regression to Date.now() would make the path independent of enemy.age.
describe('updateGameState — swarm weave is driven by game time, not wall-clock', () => {
  it('the weave reads enemy.age (twins differing only in age move differently)', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const pos = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    // Two swarm "twins": identical id (→ identical phase offset) and start
    // position, differing only in age. Processed in ONE tick (shared Date.now),
    // age is the only thing that can make them diverge — and the age-driven
    // weave does. A wall-clock weave would move them identically.
    const twinA = { ...createEnemy(EnemyKind.swarm, pos), id: 'twin', age: 0 }
    const twinB = { ...createEnemy(EnemyKind.swarm, pos), id: 'twin', age: 0.6 }
    state = {
      ...state,
      spawn: { ...state.spawn, queue: [], waveTimer: 0 },
      enemies: [twinA, twinB],
    }

    const next = updateGameState(state, 1 / 60, { clicks: [], selectedAbility: null })
    const [a, b] = next.enemies
    expect(a.pos.x !== b.pos.x || a.pos.y !== b.pos.y).toBe(true)
  })

  it('advances enemy age by the (speed-scaled) dt each tick', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const swarm = {
      ...createEnemy(EnemyKind.swarm, { x: state.ship.pos.x + 300, y: state.ship.pos.y }),
      age: 0,
    }
    state = { ...state, spawn: { ...state.spawn, queue: [], waveTimer: 0 }, enemies: [swarm] }
    const next = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    expect(next.enemies.find((e) => e.id === swarm.id)!.age).toBeCloseTo(0.05, 5)
  })
})

// A bomber's death explosion damages the ship if it's within range. The
// shield should eat the blast ONLY when the ship is INSIDE the dome AND the
// bomber is OUTSIDE the dome — every other combination still hurts.
describe('updateGameState — shield blocks bomber explosions', () => {
  function shieldEffect(centerOn: { x: number; y: number }, radius = 120) {
    return {
      id: 'test-shield',
      kind: EffectKind.shield,
      pos: { x: centerOn.x, y: centerOn.y },
      elapsed: 0,
      duration: 6,
      radius,
      grandfatheredEnemyIds: [] as string[],
    }
  }

  it('BLOCKS when ship is inside and bomber is outside', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, { x: state.ship.pos.x + 30, y: state.ship.pos.y }),
      // hp 0 so it explodes on frame one — the ship no longer auto-attacks to kill it.
      hp: 0,
    }
    state = {
      ...state,
      ship: { ...state.ship, hp: 100, shield: 0 },
      enemies: [bomber],
      activeEffects: [...state.activeEffects, shieldEffect(state.ship.pos, 20)],
    }
    for (let i = 0; i < 30 && state.enemies.length > 0; i++) {
      state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    }
    expect(state.ship.hp).toBe(100)
  })

  it('does NOT block when bomber is inside the same shield as the ship', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, { x: state.ship.pos.x + 30, y: state.ship.pos.y }),
      // hp 0 so it explodes on frame one — the ship no longer auto-attacks to kill it.
      hp: 0,
    }
    // Grandfather the bomber so the shield doesn't push it out — we want to
    // exercise the "bomber inside dome" branch of resolveDeathEffects.
    const shield = { ...shieldEffect(state.ship.pos, 200), grandfatheredEnemyIds: [bomber.id] }
    state = {
      ...state,
      ship: { ...state.ship, hp: 100, shield: 0 },
      enemies: [bomber],
      activeEffects: [...state.activeEffects, shield],
    }
    for (let i = 0; i < 30 && state.enemies.length > 0; i++) {
      state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    }
    expect(state.ship.hp).toBeLessThan(100)
  })

  it('does NOT block when ship is outside the shield', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    const bomber = {
      ...createEnemy(EnemyKind.bomber, { x: state.ship.pos.x + 30, y: state.ship.pos.y }),
      // hp 0 so it explodes on frame one — the ship no longer auto-attacks to kill it.
      hp: 0,
    }
    state = {
      ...state,
      ship: { ...state.ship, hp: 100, shield: 0 },
      enemies: [bomber],
      activeEffects: [
        ...state.activeEffects,
        shieldEffect({ x: state.ship.pos.x + 1000, y: state.ship.pos.y }, 120),
      ],
    }
    for (let i = 0; i < 30 && state.enemies.length > 0; i++) {
      state = updateGameState(state, 0.05, { clicks: [], selectedAbility: null })
    }
    expect(state.ship.hp).toBeLessThan(100)
  })
})

describe('swept bullet collision — regression', () => {
  // At dt=0.1 (MAX_DT), a bullet at speed 400 moves 40 units. An enemy with
  // radius 10 and combined radius 14 can be skipped by the old point check if
  // the bullet starts 25 units before the enemy and lands 15 units past it —
  // point distance 15 > 14, so point check misses. Swept check catches it.
  it('bullet jumps over thin enemy without swept check, catches it with swept check', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)

    const enemyX = 1600 // fixed x coordinate (far from ship at 1500)
    // Enemy is stationary (speed=0 so it doesn't move during the tick)
    const enemy = { ...createEnemy(EnemyKind.drone, { x: enemyX, y: 1500 }), speed: 0 }

    // Bullet starts 25 units behind the enemy, moves +x at 400 units/s
    // After dt=0.1: moves 40 units, landing 15 units past the enemy.
    // Point check: dist(1640, 1600) = 40 — wait, let me recalculate.
    // start=1575, end=1615, enemy=1600: dist(end, enemy) = 15 > combined 14 → point check MISSES.
    const bulletStart = { x: enemyX - 25, y: 1500 }
    const proj = createProjectile(
      bulletStart,
      { x: enemyX + 100, y: 1500 },
      ProjectileOwner.ship,
      10
    )

    state = {
      ...state,
      enemies: [enemy],
      projectiles: [proj],
      spawn: { ...state.spawn, queue: [] },
    }
    state = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })

    const surviving = state.enemies.find((e) => e.id === enemy.id)
    expect(!surviving || surviving.hp < enemy.hp).toBe(true)
  })
})

describe('Helper ability', () => {
  function makeUnlockedState() {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = applyUpgradeToState({ ...state, currency: 999 }, UpgradeId.unlockHelper)
    return state
  }

  it('spawns an ally when helper ability is activated', () => {
    let state = makeUnlockedState()
    // totalWaveEnemies=0 prevents wave-complete from firing with empty enemies
    state = { ...state, enemies: [], spawn: { ...state.spawn, queue: [], total: 0 } }
    const target = { x: state.ship.pos.x + 100, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [target],
      selectedAbility: AbilityKind.helper,
    })
    expect(state.allies.length).toBe(1)
  })

  it('ally fires a projectile when an enemy is in range', () => {
    let state = makeUnlockedState()
    const allySpawnPos = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    state = { ...state, spawn: { ...state.spawn, total: 0, queue: [] } }
    state = updateGameState(state, 0.016, {
      clicks: [allySpawnPos],
      selectedAbility: AbilityKind.helper,
    })
    // Place enemy near ally, within attackRange
    const allyPos = state.allies[0]?.pos ?? allySpawnPos
    // Within the ally's attackRange (200) but far enough that its shot doesn't
    // reach — and get consumed by — the enemy within the tick.
    const enemy = createEnemy(EnemyKind.drone, { x: allyPos.x + 150, y: allyPos.y })
    state = { ...state, enemies: [enemy] }
    const projsBefore = state.projectiles.length
    state = updateGameState(state, 0.1, { clicks: [], selectedAbility: AbilityKind.helper })
    expect(state.projectiles.length).toBeGreaterThan(projsBefore)
  })

  it('ally is removed when HP decay drops its hp to 0', () => {
    let state = makeUnlockedState()
    state = { ...state, enemies: [], spawn: { ...state.spawn, queue: [], total: 0 } }
    const target = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [target],
      selectedAbility: AbilityKind.helper,
    })
    expect(state.allies.length).toBe(1)
    const maxHp = state.allies[0].maxHp
    // Advance enough seconds for steady HP decay to exhaust hp. Loop because
    // MAX_DT caps each tick.
    let elapsed = 0
    const lifetimeBudget = maxHp + 5
    while (elapsed < lifetimeBudget && state.allies.length > 0) {
      state = updateGameState(state, 0.1, { clicks: [], selectedAbility: null })
      elapsed += 0.1
    }
    expect(state.allies.length).toBe(0)
  })

  it('ally HP is reduced by enemy projectiles', () => {
    let state = makeUnlockedState()
    const allyPos = { x: 100, y: 100 }
    // totalWaveEnemies=0 prevents the wave-complete check from firing when enemies=[]
    state = { ...state, enemies: [], spawn: { ...state.spawn, queue: [], total: 0 } }
    state = updateGameState(state, 0.016, {
      clicks: [allyPos],
      selectedAbility: AbilityKind.helper,
    })
    expect(state.allies.length).toBe(1)
    const allyMaxHp = state.allies[0].maxHp
    // Stationary projectile at exact ally position — guaranteed overlap every tick
    const proj = {
      ...createProjectile(allyPos, { x: allyPos.x + 1, y: allyPos.y }, ProjectileOwner.enemy, 5),
      vel: { x: 0, y: 0 },
      pos: { ...allyPos },
      prevPos: { ...allyPos },
    }
    state = { ...state, projectiles: [proj], allies: [{ ...state.allies[0], pos: { ...allyPos } }] }
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const anyAllyTookDamage =
      state.allies.some((a) => a.hp < allyMaxHp) || state.allies.length === 0
    expect(anyAllyTookDamage).toBe(true)
  })
})

describe('Telekinesis ability', () => {
  function makeTKState() {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = applyUpgradeToState({ ...state, currency: 999 }, UpgradeId.unlockTelekinesis)
    // armSeconds * powerPerSec = 1 * 20 = 20. Give plenty.
    return { ...state, power: 500 }
  }

  it('pushes enemies inside the radius radially and leaves far enemies alone', () => {
    let state = makeTKState()
    const cursorPos = { x: state.ship.pos.x + 100, y: state.ship.pos.y }
    // Stationary enemies so chase movement doesn't pollute the assertion.
    const nearEnemy = {
      ...createEnemy(EnemyKind.drone, { x: cursorPos.x + 30, y: cursorPos.y }),
      speed: 0,
    }
    const farEnemy = {
      ...createEnemy(EnemyKind.drone, {
        x: cursorPos.x + TELEKINESIS.radius + 100,
        y: cursorPos.y,
      }),
      speed: 0,
    }
    state = { ...state, enemies: [nearEnemy, farEnemy], spawn: { ...state.spawn, queue: [] } }
    const before = state.enemies.map((e) => e.pos.x)
    state = updateGameState(state, 0.1, {
      clicks: [],
      selectedAbility: AbilityKind.telekinesis,
      isHolding: true,
      holdPos: cursorPos,
    })
    const nearAfter = state.enemies.find((e) => e.id === nearEnemy.id)!
    const farAfter = state.enemies.find((e) => e.id === farEnemy.id)!
    // Telekinesis pushes: the near enemy (east of cursor) moves further east.
    expect(nearAfter.pos.x).toBeGreaterThan(before[0])
    // Far enemy is outside the radius — untouched.
    expect(farAfter.pos.x).toBeCloseTo(before[1], 1)
  })

  it('drains power while held', () => {
    let state = makeTKState()
    const cursorPos = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    const powerBefore = state.power
    state = updateGameState(state, 0.1, {
      clicks: [],
      selectedAbility: AbilityKind.telekinesis,
      isHolding: true,
      holdPos: cursorPos,
    })
    expect(state.power).toBeLessThan(powerBefore)
  })

  it('sets telekinesisPos and telekinesisActive while held, clears them on release', () => {
    let state = makeTKState()
    const cursorPos = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.telekinesis,
      isHolding: true,
      holdPos: cursorPos,
    })
    expect(state.holdStates[AbilityKind.telekinesis]?.target).toEqual(cursorPos)
    expect(state.holdStates[AbilityKind.telekinesis]?.active).toBe(true)

    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.telekinesis,
      isHolding: false,
      holdPos: null,
    })
    expect(state.holdStates[AbilityKind.telekinesis]?.target).toBeNull()
    expect(state.holdStates[AbilityKind.telekinesis]?.active).toBe(false)
  })

  it('cannot start without the required amount of power (arm threshold)', () => {
    let state = makeTKState()
    state = { ...state, power: TELEKINESIS.powerPerSec * TELEKINESIS.armSeconds - 5 }
    const cursorPos = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.telekinesis,
      isHolding: true,
      holdPos: cursorPos,
    })
    expect(state.holdStates[AbilityKind.telekinesis]?.active).toBe(false)
    expect(state.holdStates[AbilityKind.telekinesis]?.target).toBeNull()
  })
  it('can start with the required amount of power (arm threshold)', () => {
    let state = makeTKState()
    state = { ...state, power: TELEKINESIS.powerPerSec * TELEKINESIS.armSeconds + 5 }
    const cursorPos = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.telekinesis,
      isHolding: true,
      holdPos: cursorPos,
    })
    expect(state.holdStates[AbilityKind.telekinesis]?.active).toBe(true)
    expect(state.holdStates[AbilityKind.telekinesis]?.target).toEqual(cursorPos)
  })

  it('stops once power runs out', () => {
    let state = makeTKState()
    state = { ...state, power: TELEKINESIS.powerPerSec * TELEKINESIS.armSeconds * 2 } // double arm threshold
    const cursorPos = { x: state.ship.pos.x + 50, y: state.ship.pos.y }
    const totalDrainPerSecond = TELEKINESIS.powerPerSec - POWER_DEFAULTS.regenRate
    const secondsToDrain = state.power / totalDrainPerSecond
    const ticksToDrain = Math.ceil(secondsToDrain / 0.1) // MAX_DT is 0.1
    for (let i = 0; i < ticksToDrain - 1; i++) {
      state = updateGameState(state, 0.1, {
        clicks: [],
        selectedAbility: AbilityKind.telekinesis,
        isHolding: true,
        holdPos: cursorPos,
      })
    }
    expect(state.holdStates[AbilityKind.telekinesis]?.active).toBe(true)
    for (let i = 0; i < 1; i++) {
      state = updateGameState(state, 0.1, {
        clicks: [],
        selectedAbility: AbilityKind.telekinesis,
        isHolding: true,
        holdPos: cursorPos,
      })
    }
    expect(state.holdStates[AbilityKind.telekinesis]?.active).toBe(false)
  })
})

describe('Solar Flare ability', () => {
  function makeSFState() {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = applyUpgradeToState({ ...state, currency: 999 }, UpgradeId.unlockSolarFlare)
    return state
  }

  it('damages enemies inside the radius and not those outside', () => {
    let state = makeSFState()
    state = { ...state, power: 1000 }
    const target = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    const enemyInside = createEnemy(EnemyKind.drone, {
      // Close to the target — within aoeRadius (60)
      x: target.x + 20,
      y: target.y,
    })
    const enemyOutside = createEnemy(EnemyKind.drone, {
      x: target.x + 500,
      y: target.y,
    })
    state = { ...state, enemies: [enemyInside, enemyOutside], spawn: { ...state.spawn, queue: [] } }
    state = updateGameState(state, SOLAR_FLARE.drainInterval + 0.01, {
      clicks: [],
      selectedAbility: AbilityKind.solarFlare,
      isHolding: true,
      holdPos: target,
    })
    const insideAfter = state.enemies.find((e) => e.id === enemyInside.id)
    const outsideAfter = state.enemies.find((e) => e.id === enemyOutside.id)
    const insideDamaged = !insideAfter || insideAfter.hp < enemyInside.hp
    expect(insideDamaged).toBe(true)
    expect(outsideAfter?.hp).toBe(enemyOutside.hp)
  })

  it('drains power on each interval tick', () => {
    let state = makeSFState()
    state = { ...state, power: 1000 }
    const target = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    const powerBefore = state.power
    state = updateGameState(state, SOLAR_FLARE.drainInterval + 0.01, {
      clicks: [],
      selectedAbility: AbilityKind.solarFlare,
      isHolding: true,
      holdPos: target,
    })
    expect(state.power).toBeLessThan(powerBefore)
  })

  it('sets solarFlareTarget while held with enough power, clears it on release', () => {
    let state = makeSFState()
    state = { ...state, power: 1000 }
    const target = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.solarFlare,
      isHolding: true,
      holdPos: target,
    })
    expect(state.holdStates[AbilityKind.solarFlare]?.target).toEqual(target)
    expect(state.holdStates[AbilityKind.solarFlare]?.active).toBe(true)

    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.solarFlare,
      isHolding: false,
    })
    expect(state.holdStates[AbilityKind.solarFlare]?.target).toBeNull()
    expect(state.holdStates[AbilityKind.solarFlare]?.active).toBe(false)
  })

  it('cannot start firing without 1s of power (arm threshold)', () => {
    let state = makeSFState()
    // Arm cost = armSeconds * powerPerSec = 1 * 20 = 20. Set below.
    state = { ...state, power: 10 }
    const target = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    state = updateGameState(state, 0.016, {
      clicks: [],
      selectedAbility: AbilityKind.solarFlare,
      isHolding: true,
      holdPos: target,
    })
    expect(state.holdStates[AbilityKind.solarFlare]?.active).toBe(false)
    expect(state.holdStates[AbilityKind.solarFlare]?.target).toBeNull()
  })

  it('stops firing once power runs out', () => {
    let state = makeSFState()
    // Set totalWaveEnemies=0 so the wave-complete branch doesn't fire and
    // reset holdStates while we drain power.
    state = { ...state, power: 30, spawn: { ...state.spawn, total: 0, queue: [] } } // Just above arm threshold (20)
    const target = { x: state.ship.pos.x + 300, y: state.ship.pos.y }
    // dt is capped at MAX_DT (0.1). Loop long enough to drain past 0 even
    // after passive power regen.
    for (let i = 0; i < 200; i++) {
      state = updateGameState(state, 0.1, {
        clicks: [],
        selectedAbility: AbilityKind.solarFlare,
        isHolding: true,
        holdPos: target,
      })
    }
    expect(state.holdStates[AbilityKind.solarFlare]?.active).toBe(false)
  })
})

describe('Enemy melee damages allies', () => {
  it('a non-bomber enemy that touches an ally damages it, survives, and is knocked back', () => {
    let state = startGame(createInitialState(), ShipKind.fighter)
    state = startNextWave(state)
    state = applyUpgradeToState({ ...state, currency: 999 }, UpgradeId.unlockHelper)
    const allyPos = { x: 100, y: 100 }
    state = { ...state, enemies: [], spawn: { ...state.spawn, queue: [], total: 0 } }
    state = updateGameState(state, 0.016, {
      clicks: [allyPos],
      selectedAbility: AbilityKind.helper,
    })
    expect(state.allies.length).toBe(1)
    const allyMaxHp = state.allies[0].maxHp
    const enemy = { ...createEnemy(EnemyKind.drone, { ...allyPos }), speed: 0 }
    state = {
      ...state,
      enemies: [enemy],
      allies: [{ ...state.allies[0], pos: { ...allyPos } }],
    }
    state = updateGameState(state, 0.016, { clicks: [], selectedAbility: null })
    const allyDamaged = state.allies.length === 0 || state.allies.some((a) => a.hp < allyMaxHp)
    expect(allyDamaged).toBe(true)
    // Drone survives the bump (bombers are the only kind that suicide on contact).
    expect(state.enemies.find((e) => e.id === enemy.id)).toBeDefined()
  })
})

describe('updateGameState — sector progression', () => {
  const noInput = { clicks: [], selectedAbility: null }
  const playing = () => startNextWave(startGame(createInitialState(), ShipKind.fighter))
  const mine = (pos: { x: number; y: number }) => ({
    id: 'h1',
    kind: HazardKind.mine,
    pos,
    radius: 26,
    damage: 35,
  })

  it('threads hazards through the normal return', () => {
    let state = playing()
    state = {
      ...state,
      hazards: [mine({ x: state.ship.pos.x + 9999, y: state.ship.pos.y })],
      enemies: [createEnemy(EnemyKind.drone, { x: 0, y: 0 })],
    }
    expect(updateGameState(state, 0.016, noInput).hazards).toHaveLength(1)
  })

  it('threads hazards through the wave-complete early return', () => {
    let state = playing()
    state = {
      ...state,
      hazards: [mine({ x: state.ship.pos.x + 9999, y: state.ship.pos.y })],
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 1, spawned: 1, waveTimer: 0 },
    }
    const next = updateGameState(state, 0.016, noInput)
    expect(next.phase).not.toBe(GamePhase.playing)
    expect(next.hazards).toHaveLength(1)
  })

  it('hazards do not block wave completion (they are not enemies)', () => {
    let state = playing()
    state = {
      ...state,
      hazards: [mine({ x: state.ship.pos.x, y: state.ship.pos.y })],
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 3, spawned: 3, waveTimer: 0 },
    }
    const next = updateGameState(state, 0.016, noInput)
    expect([GamePhase.waveComplete, GamePhase.upgradeScreen]).toContain(next.phase)
  })

  it('hunts toward a nearby enemy instead of ignoring it', () => {
    // Gate spawning so only the planted (stationary, un-killable) enemy is present.
    const planted = playing()
    let state = { ...planted, spawn: { ...planted.spawn, waveTimer: 100 } }
    const startPos = { ...state.ship.pos }
    const enemyPos = { x: startPos.x, y: startPos.y - 500 } // up, well within half a world
    state = {
      ...state,
      enemies: [{ ...createEnemy(EnemyKind.drone, enemyPos), speed: 0, hp: 1e6, maxHp: 1e6 }],
    }
    const distBefore = Math.hypot(enemyPos.x - startPos.x, enemyPos.y - startPos.y)
    for (let i = 0; i < 20; i++) state = updateGameState(state, 0.1, noInput)
    const distAfter = Math.hypot(enemyPos.x - state.ship.pos.x, enemyPos.y - state.ship.pos.y)
    expect(distAfter).toBeLessThan(distBefore)
    expect(state.ship.pos.y).toBeLessThan(startPos.y) // moved up toward the enemy
  })

  it('auto-collects dropped collectibles when warping after a sector clear', () => {
    let state = playing()
    state = {
      ...state,
      wave: WAVES_PER_LEVEL, // last wave of sector 1 → clearing it warps
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 1, spawned: 1, waveTimer: 0 },
      spaceMetal: 0,
      singularityShard: 0,
      collectibles: [
        {
          id: 'm',
          kind: CollectibleKind.spaceMetal,
          pos: { x: 0, y: 0 },
          vel: { x: 0, y: 0 },
          value: 2,
          elapsed: 0,
          lifetime: 12,
          homing: false,
        },
        {
          id: 's',
          kind: CollectibleKind.singularityShard,
          pos: { x: 0, y: 0 },
          vel: { x: 0, y: 0 },
          value: 1,
          elapsed: 0,
          lifetime: 12,
          homing: false,
        },
      ],
    }
    const next = updateGameState(state, 0.016, noInput)
    expect(next.phase).toBe(GamePhase.warping)
    expect(next.spaceMetal).toBe(2) // banked, not lost to the warp
    expect(next.singularityShard).toBe(1)
    expect(next.collectibles).toEqual([])
  })

  it('warps into a fresh sector, then opens the shop, then starts the wave', () => {
    // Sit on the last wave of sector 1 with the field cleared.
    let state = playing()
    state = {
      ...state,
      wave: WAVES_PER_LEVEL,
      enemies: [],
      spawn: { ...state.spawn, queue: [], total: 1, spawned: 1, waveTimer: 0 },
    }
    state = updateGameState(state, 0.016, noInput)
    expect(state.phase).toBe(GamePhase.warping) // warp comes first
    expect(state.warpTimer).toBeGreaterThan(0)

    // Warp lands in the next sector and opens the shop — wave not spawned yet.
    const warped = completeWarp(state)
    expect(warped.phase).toBe(GamePhase.upgradeScreen)
    expect(warped.wave).toBe(WAVES_PER_LEVEL + 1)
    expect(warped.worldSize).toEqual(WORLD_SIZE)
    // Every sector drops the ship at the centre of the torus.
    expect(warped.ship.pos).toEqual({ x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y / 2 })
    expect(warped.spawn.queue).toEqual([])

    // Leaving the shop spawns the wave in the sector already laid out.
    const live = finishUpgradeScreen(warped)
    expect(live.phase).toBe(GamePhase.playing)
    expect(live.wave).toBe(WAVES_PER_LEVEL + 1) // not advanced again
    expect(live.spawn.queue.length).toBeGreaterThan(0)
  })

  it('makes the same forward progress at 2x sub-steps as one full step', () => {
    const setup = () => {
      const p = playing()
      return { ...p, spawn: { ...p.spawn, waveTimer: 100 } }
    }
    const once = updateGameState(setup(), 0.1, noInput)
    let twice = setup()
    twice = updateGameState(twice, 0.05, noInput)
    twice = updateGameState(twice, 0.05, noInput)
    expect(twice.ship.pos.y).toBeCloseTo(once.ship.pos.y, 3)
  })
})
