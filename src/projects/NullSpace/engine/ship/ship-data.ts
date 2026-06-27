import { ShipKind } from '../types'

type ShipVariantStats = {
  hp: number
  maxHp: number
  maxShield: number
  shieldRegen: number
  speed: number
  radius: number
}

export type ShipVariantConfig = {
  label: string
  description: string
  stats: ShipVariantStats
}

// Upper bounds for the ship-select stat bars — the full-bar visual scale, not a
// gameplay cap. Keyed by stat so a ceiling can't silently drift from a tweaked variant.
export const STAT_MAX = {
  maxHp: 160,
  maxShield: 140,
  shieldRegen: 8,
  speed: 200,
} as const

export const SHIP_ORDER: ShipKind[] = [ShipKind.fighter, ShipKind.interceptor, ShipKind.dreadnought]

export const SHIP_VARIANTS: Record<ShipKind, ShipVariantConfig> = {
  [ShipKind.fighter]: {
    label: 'Fighter',
    description: 'Balanced all-round ship. Reliable in any situation.',
    stats: {
      hp: 100,
      maxHp: 100,
      maxShield: 50,
      shieldRegen: 4,
      speed: 120,
      radius: 16,
    },
  },
  [ShipKind.interceptor]: {
    label: 'Interceptor',
    description: 'Fast and nimble. Hard to pin down, but fragile under sustained fire.',
    stats: {
      hp: 70,
      maxHp: 70,
      maxShield: 25,
      shieldRegen: 3,
      speed: 180,
      radius: 14,
    },
  },
  [ShipKind.dreadnought]: {
    label: 'Dreadnought',
    description: 'Massive shield pool that regens after a brief cooldown. Slow but hard to kill.',
    stats: {
      hp: 110,
      maxHp: 110,
      maxShield: 120,
      shieldRegen: 6,
      speed: 75,
      radius: 18,
    },
  },
}
