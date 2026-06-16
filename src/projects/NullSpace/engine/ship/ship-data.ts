import { ShipKind } from '../types'

export type ShipVariantStats = {
  hp: number
  maxHp: number
  maxShield: number
  shieldRegen: number
  damage: number
  fireRate: number
  speed: number
  attackRange: number
  radius: number
  weaponSlots: number
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
  damage: 10,
  speed: 200,
  fireRate: 4,
  weaponSlots: 4,
} as const

export const SHIP_ORDER: ShipKind[] = [
  ShipKind.fighter,
  ShipKind.interceptor,
  ShipKind.dreadnought,
  ShipKind.carrier,
]

export const SHIP_VARIANTS: Record<ShipKind, ShipVariantConfig> = {
  [ShipKind.fighter]: {
    label: 'Fighter',
    description: 'Balanced all-round ship. Reliable in any situation.',
    stats: {
      hp: 100,
      maxHp: 100,
      maxShield: 50,
      shieldRegen: 4,
      damage: 6,
      fireRate: 2.5,
      speed: 120,
      attackRange: 280,
      radius: 16,
      weaponSlots: 1,
    },
  },
  [ShipKind.interceptor]: {
    label: 'Interceptor',
    description: 'Fast and hard-hitting. Fragile under sustained fire.',
    stats: {
      hp: 70,
      maxHp: 70,
      maxShield: 25,
      shieldRegen: 3,
      damage: 8,
      fireRate: 3,
      speed: 180,
      attackRange: 280,
      radius: 14,
      weaponSlots: 1,
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
      damage: 4,
      fireRate: 1.5,
      speed: 75,
      attackRange: 280,
      radius: 18,
      weaponSlots: 1,
    },
  },
  [ShipKind.carrier]: {
    label: 'Carrier',
    description: 'Fields 3 weapons at once, but with a weaker hull, lower speed, and slower guns.',
    stats: {
      hp: 75,
      maxHp: 75,
      maxShield: 30,
      shieldRegen: 2,
      damage: 4,
      fireRate: 1.5,
      speed: 90,
      attackRange: 280,
      radius: 16,
      weaponSlots: 3,
    },
  },
}
