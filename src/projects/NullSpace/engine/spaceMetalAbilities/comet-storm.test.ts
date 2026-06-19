import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, startGame } from '../game-loop'
import { EffectKind, ShipKind } from '../types'
import type { CometStormEffect } from '../types'
import { SpaceMetalAbilityKind, tryActivateSpaceMetalAbility } from '.'
import { COMET_STORM, cometStormEffect } from './comet-storm'

beforeEach(() => {
  localStorage.clear()
})

function ready(): ReturnType<typeof createInitialState> {
  return { ...startGame(createInitialState(), ShipKind.fighter), spaceMetal: 5 }
}

function cometStormOf(state: ReturnType<typeof createInitialState>): CometStormEffect {
  const storm = state.activeEffects.find((e) => e.kind === EffectKind.cometStorm)
  if (!storm) throw new Error('no comet storm in state')
  return storm as CometStormEffect
}

describe('comet-storm space-metal ability', () => {
  it('activate deducts the cost and spawns one comet storm', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.cometStorm)
    expect(state.spaceMetal).toBe(5 - COMET_STORM.cost)
    expect(state.activeEffects.filter((e) => e.kind === EffectKind.cometStorm)).toHaveLength(1)
  })

  it('activation is a no-op without enough space metal', () => {
    const state = { ...ready(), spaceMetal: COMET_STORM.cost - 1 }
    const result = tryActivateSpaceMetalAbility(state, SpaceMetalAbilityKind.cometStorm)
    expect(result.spaceMetal).toBe(COMET_STORM.cost - 1)
    expect(result.activeEffects.filter((e) => e.kind === EffectKind.cometStorm)).toHaveLength(0)
  })

  it('drops a wave of meteorite strikes near the ship, following the player', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.cometStorm)
    const storm = cometStormOf(state)
    const ship = { ...state.ship, pos: { x: 4000, y: 2500 } }

    // Half an interval guarantees exactly one wave fires, whatever the tuning.
    const result = cometStormEffect.tick(storm, {
      enemies: [],
      projectiles: [],
      ship,
      worldSize: state.worldSize,
      dt: COMET_STORM.spawnInterval / 2,
    })

    expect(result.spawnedEffects).toBeDefined()
    expect(result.spawnedEffects).toHaveLength(COMET_STORM.cometsPerWave)
    for (const comet of result.spawnedEffects!) {
      expect(comet.kind).toBe(EffectKind.meteoriteStrike)
      const d = Math.hypot(comet.pos.x - ship.pos.x, comet.pos.y - ship.pos.y)
      expect(d).toBeLessThanOrEqual(COMET_STORM.spreadRadius + 0.001)
    }
  })

  it('stops emitting once its duration is reached', () => {
    const state = tryActivateSpaceMetalAbility(ready(), SpaceMetalAbilityKind.cometStorm)
    const storm = cometStormOf(state)
    const result = cometStormEffect.tick(
      { ...storm, elapsed: COMET_STORM.duration },
      {
        enemies: [],
        projectiles: [],
        ship: state.ship,
        worldSize: state.worldSize,
        dt: 0.1,
      }
    )
    expect(result.effect).toBeNull()
    expect(result.spawnedEffects ?? []).toHaveLength(0)
  })
})
