import { describe, it, expect, beforeEach } from 'vitest'
import { spawnPositionNearShip } from './spawner'
import { SPAWN_CONE, WORLD_SIZE } from '../../data'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(123))

const shipPos = { x: 1500, y: 1500 }
const forward = { x: 0, y: 1 }

// Absolute angular distance of a spawn point from the forward direction.
function angleFromForward(p: { x: number; y: number }): number {
  let d = Math.atan2(p.y - shipPos.y, p.x - shipPos.x) - Math.atan2(forward.y, forward.x)
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return Math.abs(d)
}

describe('spawnPositionNearShip', () => {
  it('biases most spawns into the forward cone', () => {
    const N = 400
    let inCone = 0
    for (let i = 0; i < N; i++) {
      if (
        angleFromForward(spawnPositionNearShip(shipPos, WORLD_SIZE, forward, 1)) <=
        SPAWN_CONE.forwardHalfAngle + 1e-6
      )
        inCone++
    }
    expect(inCone / N).toBeGreaterThan(SPAWN_CONE.forwardFraction - 0.1)
  })

  it('tightens the forward cone as waves climb', () => {
    const maxConeDeviation = (wave: number) => {
      let max = 0
      for (let i = 0; i < 600; i++) {
        const d = angleFromForward(spawnPositionNearShip(shipPos, WORLD_SIZE, forward, wave))
        if (d <= SPAWN_CONE.forwardHalfAngle + 1e-6) max = Math.max(max, d)
      }
      return max
    }
    rng.reseed(7)
    const early = maxConeDeviation(1)
    rng.reseed(7)
    const late = maxConeDeviation(40)
    expect(late).toBeLessThan(early)
  })

  it('keeps every spawn within world bounds', () => {
    for (let i = 0; i < 200; i++) {
      const p = spawnPositionNearShip(shipPos, WORLD_SIZE, forward, 1)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(WORLD_SIZE.x)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(WORLD_SIZE.y)
    }
  })
})
