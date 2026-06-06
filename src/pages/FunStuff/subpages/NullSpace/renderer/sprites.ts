export type SpriteData = (string | null)[][]

const _ = null
const G = '#e9b872' // accent gold
const g = '#c49a58' // dark gold
const D = '#f3c98c' // light gold
const W = '#f3efe7' // white/text
const R = '#cc3333' // red
const r = '#992222' // dark red
const B = '#882244' // dark magenta
const T = '#556677' // steel
const t = '#445566' // dark steel
const C = '#66aacc' // cyan accent
const F = '#ff6633' // fire orange

export const SHIP_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, G, G, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, D, D, G, _, _, _, _, _, _],
  [_, _, _, _, _, G, D, W, W, D, G, _, _, _, _, _],
  [_, _, _, _, G, G, D, D, D, D, G, G, _, _, _, _],
  [_, _, _, G, g, G, G, G, G, G, G, g, G, _, _, _],
  [_, _, G, g, g, G, C, G, G, C, G, g, g, G, _, _],
  [_, G, g, g, G, G, G, G, G, G, G, G, g, g, G, _],
  [_, G, g, G, G, g, G, G, G, G, g, G, G, g, G, _],
  [G, G, G, G, g, g, g, G, G, g, g, g, G, G, G, G],
  [G, g, G, g, g, g, G, G, G, G, g, g, g, G, g, G],
  [_, g, G, g, g, G, G, g, g, G, G, g, g, G, g, _],
  [_, _, g, g, G, G, g, g, g, g, G, G, g, g, _, _],
  [_, _, _, g, G, g, g, g, g, g, g, G, g, _, _, _],
  [_, _, _, _, g, g, g, _, _, g, g, g, _, _, _, _],
  [_, _, _, _, _, g, F, _, _, F, g, _, _, _, _, _],
  [_, _, _, _, _, _, F, _, _, F, _, _, _, _, _, _],
]

export const DRONE_SPRITE: SpriteData = [
  [_, _, _, _, R, R, _, _, _, _, R, R, _, _, _, _],
  [_, _, _, R, r, R, _, _, _, _, R, r, R, _, _, _],
  [_, _, R, r, R, _, _, _, _, _, _, R, r, R, _, _],
  [_, _, R, R, _, _, _, R, R, _, _, _, R, R, _, _],
  [_, _, _, _, _, _, R, r, r, R, _, _, _, _, _, _],
  [_, _, _, _, _, R, r, B, B, r, R, _, _, _, _, _],
  [_, _, _, _, R, r, B, W, W, B, r, R, _, _, _, _],
  [_, _, _, _, R, r, B, B, B, B, r, R, _, _, _, _],
  [_, _, _, _, _, R, r, r, r, r, R, _, _, _, _, _],
  [_, _, _, _, _, _, R, R, R, R, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, R, R, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

export const TANK_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, t, t, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, t, T, T, t, _, _, _, _, _, _],
  [_, _, _, _, _, t, T, T, T, T, t, _, _, _, _, _],
  [_, _, _, _, t, T, T, T, T, T, T, t, _, _, _, _],
  [_, _, _, t, T, r, T, T, T, T, r, T, t, _, _, _],
  [_, _, t, T, T, r, r, T, T, r, r, T, T, t, _, _],
  [_, t, T, T, r, R, r, T, T, r, R, r, T, T, t, _],
  [_, t, T, T, r, r, r, T, T, r, r, r, T, T, t, _],
  [t, T, T, T, T, r, T, T, T, T, r, T, T, T, T, t],
  [t, T, T, T, T, T, T, t, t, T, T, T, T, T, T, t],
  [_, t, T, T, T, T, t, t, t, t, T, T, T, T, t, _],
  [_, t, T, T, T, t, t, _, _, t, t, T, T, T, t, _],
  [_, _, t, T, t, t, _, _, _, _, t, t, T, t, _, _],
  [_, _, _, t, t, _, _, _, _, _, _, t, t, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

export const PROJECTILE_SPRITE: SpriteData = [
  [_, G, _],
  [G, W, G],
  [_, G, _],
]

export const METEOR_SPRITE: SpriteData = [
  [_, _, _, F, F, _, _, _],
  [_, _, F, R, R, F, _, _],
  [_, F, R, r, r, R, F, _],
  [F, R, r, r, r, r, R, F],
  [F, R, r, r, r, r, R, F],
  [_, F, R, r, r, R, F, _],
  [_, _, F, R, R, F, _, _],
  [_, _, _, F, F, _, _, _],
]

export const METEORITE_SPRITE: SpriteData = [
  [_, _, F, _, _],
  [_, F, r, F, _],
  [F, r, r, r, F],
  [_, F, r, F, _],
  [_, _, F, _, _],
]

const P = '#8855cc' // purple
const p = '#663399' // dark purple

// Diamond-bodied shooter with a clear forward-facing barrel and a glowing
// cyan-cored eye. The lateral fins make it instantly distinguishable from
// the drone (which is small/asymmetric) and the tank (bulky/steel).
export const SHOOTER_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, P, P, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, P, p, p, P, _, _, _, _, _, _],
  [_, _, _, _, _, P, p, P, P, p, P, _, _, _, _, _],
  [_, _, _, _, P, p, P, C, C, P, p, P, _, _, _, _],
  [_, _, _, P, p, P, C, W, W, C, P, p, P, _, _, _],
  [_, _, P, p, P, C, W, W, W, W, C, P, p, P, _, _],
  [_, P, p, P, C, W, W, p, p, W, W, C, P, p, P, _],
  [P, p, P, P, C, W, p, P, P, p, W, C, P, P, p, P],
  [P, p, P, P, C, W, p, P, P, p, W, C, P, P, p, P],
  [_, P, p, P, C, W, W, p, p, W, W, C, P, p, P, _],
  [_, _, P, p, P, C, W, W, W, W, C, P, p, P, _, _],
  [_, _, _, P, p, P, C, W, W, C, P, p, P, _, _, _],
  [_, _, _, _, P, p, P, C, C, P, p, P, _, _, _, _],
  [_, _, _, _, _, P, p, P, P, p, P, _, _, _, _, _],
  [_, _, _, _, _, _, P, p, p, P, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, P, P, _, _, _, _, _, _, _],
]

export const ENEMY_PROJECTILE_SPRITE: SpriteData = [
  [_, R, _],
  [R, F, R],
  [_, R, _],
]

const M = '#cc44aa' // magenta
const m = '#993377' // dark magenta

export const SWARM_SPRITE: SpriteData = [
  [_, _, M, M, _, _, _, _],
  [_, M, m, m, M, _, _, _],
  [M, m, R, R, m, M, _, _],
  [M, m, R, m, m, M, M, _],
  [_, M, m, m, m, R, M, _],
  [_, _, M, m, R, M, _, _],
  [_, _, _, M, M, _, _, _],
  [_, _, _, _, _, _, _, _],
]

const O = '#dd6622' // dark orange
const o = '#aa4411' // burnt orange

export const BOMBER_SPRITE: SpriteData = [
  [_, _, _, _, _, F, F, _, _, F, F, _, _, _, _, _],
  [_, _, _, _, F, O, O, F, F, O, O, F, _, _, _, _],
  [_, _, _, F, O, o, o, O, O, o, o, O, F, _, _, _],
  [_, _, F, O, o, o, o, o, o, o, o, o, O, F, _, _],
  [_, F, O, o, o, R, o, o, o, o, R, o, o, O, F, _],
  [F, O, o, o, R, r, R, o, o, R, r, R, o, o, O, F],
  [F, O, o, o, o, R, o, o, o, o, R, o, o, o, O, F],
  [F, O, o, o, o, o, o, o, o, o, o, o, o, o, O, F],
  [F, O, o, o, o, o, o, o, o, o, o, o, o, o, O, F],
  [F, O, o, o, o, R, o, o, o, o, R, o, o, o, O, F],
  [F, O, o, o, R, r, R, o, o, R, r, R, o, o, O, F],
  [_, F, O, o, o, R, o, o, o, o, R, o, o, O, F, _],
  [_, _, F, O, o, o, o, o, o, o, o, o, O, F, _, _],
  [_, _, _, F, O, o, o, O, O, o, o, O, F, _, _, _],
  [_, _, _, _, F, O, O, F, F, O, O, F, _, _, _, _],
  [_, _, _, _, _, F, F, _, _, F, F, _, _, _, _, _],
]

// Small rocket sprite, drawn rotated to its velocity. 5×12 (so it looks like
// a slim missile rather than a meteor blob).
export const ROCKET_SPRITE: SpriteData = [
  [_, _, W, _, _],
  [_, W, R, W, _],
  [_, G, G, G, _],
  [_, g, G, g, _],
  [_, g, G, g, _],
  [_, g, G, g, _],
  [_, g, G, g, _],
  [G, g, G, g, G],
  [G, _, G, _, G],
  [_, F, F, F, _],
  [_, F, F, F, _],
  [_, _, F, _, _],
]

// Interceptor: long sleek dart silhouette. Body is 6px across the cockpit so
// the ship has presence, with thicker swept-back wings that taper out into
// extended tips — speed shows in the sweep, not in razor-thinness.
export const INTERCEPTOR_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, G, G, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, D, D, G, _, _, _, _, _, _],
  [_, _, _, _, _, G, G, W, W, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, G, C, C, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, G, D, D, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, G, G, G, G, G, _, _, _, _, _],
  [_, _, _, _, G, G, G, G, G, G, G, G, _, _, _, _],
  [_, _, _, G, G, g, G, G, G, G, g, G, G, _, _, _],
  [_, _, G, G, g, G, G, G, G, G, G, g, G, G, _, _],
  [_, G, G, g, _, G, G, G, G, G, G, _, g, G, G, _],
  [_, F, F, _, _, G, G, g, g, G, G, _, _, F, F, _],
  [_, _, _, _, _, G, G, g, g, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, G, G, G, G, G, _, _, _, _, _],
  [_, _, _, _, _, _, G, g, g, G, _, _, _, _, _, _],
  [_, _, _, _, _, _, F, _, _, F, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _],
]

// Dreadnought: wide armored hull with prominent steel plating
export const DREADNOUGHT_SPRITE: SpriteData = [
  [_, _, _, _, _, _, G, G, G, G, _, _, _, _, _, _],
  [_, _, _, _, G, G, T, T, T, T, G, G, _, _, _, _],
  [_, _, _, G, T, T, t, W, W, t, T, T, G, _, _, _],
  [_, _, G, T, T, t, T, T, T, T, t, T, T, G, _, _],
  [_, G, T, T, t, T, T, G, G, T, T, t, T, T, G, _],
  [G, T, T, t, T, T, G, T, T, G, T, T, t, T, T, G],
  [G, T, t, T, T, G, G, G, G, G, G, T, T, t, T, G],
  [G, T, t, T, T, G, G, G, G, G, G, T, T, t, T, G],
  [G, T, t, T, T, G, C, G, G, C, G, T, T, t, T, G],
  [G, T, T, t, T, T, G, G, G, G, T, T, t, T, T, G],
  [_, G, T, T, t, T, T, T, T, T, T, t, T, T, G, _],
  [_, _, G, T, T, t, T, G, G, T, t, T, T, G, _, _],
  [_, _, _, G, T, T, t, G, G, t, T, T, G, _, _, _],
  [_, _, _, _, G, G, G, g, g, G, G, G, _, _, _, _],
  [_, _, _, _, _, G, g, F, F, g, G, _, _, _, _, _],
  [_, _, _, _, _, _, F, F, F, F, _, _, _, _, _, _],
]

// Carrier: three weapons made readable as silhouette — a front gun barrel
// extending up from the nose, and a pointed gun barrel jutting out of each
// side. The point tips (D / light gold) mark the muzzle of each gun.
export const CARRIER_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, D, D, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, D, D, G, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, W, W, G, _, _, _, _, _, _],
  [_, _, _, _, _, G, G, C, C, G, G, _, _, _, _, _],
  [C, _, _, _, G, G, D, G, G, D, G, G, _, _, _, C],
  [g, _, _, _, G, G, D, G, G, D, G, G, _, _, _, g],
  [g, g, G, G, G, G, D, G, G, D, G, G, G, G, g, g],
  [g, g, G, G, G, D, C, G, G, C, D, G, G, G, g, g],
  [_, g, G, G, G, D, G, G, G, G, D, G, G, G, g, _],
  [_, g, _, G, G, D, G, G, G, G, D, G, G, _, g, _],
  [_, _, _, _, G, D, G, G, G, G, D, G, _, _, _, _],
  [_, _, _, _, _, G, G, G, G, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, G, g, g, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, g, g, g, g, G, _, _, _, _, _],
  [_, _, _, _, _, G, g, F, F, g, G, _, _, _, _, _],
  [_, _, _, _, _, _, F, _, _, F, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _],
]

const A = '#44ee44' // bright green (friendly)
const a = '#22aa22' // dark green

// Small upward-pointing triangle sprite for ally entities.
export const ALLY_SPRITE: SpriteData = [
  [_, _, _, A, _, _, _],
  [_, _, A, a, A, _, _],
  [_, A, a, a, a, A, _],
  [A, a, a, a, a, a, A],
]

export const SpriteKey = {
  ship: 'ship',
  shipInterceptor: 'shipInterceptor',
  shipDreadnought: 'shipDreadnought',
  shipCarrier: 'shipCarrier',
  drone: 'drone',
  tank: 'tank',
  shooter: 'shooter',
  swarm: 'swarm',
  bomber: 'bomber',
  projectile: 'projectile',
  enemyProjectile: 'enemyProjectile',
  meteor: 'meteor',
  meteorite: 'meteorite',
  rocket: 'rocket',
  ally: 'ally',
} as const
export type SpriteKey = (typeof SpriteKey)[keyof typeof SpriteKey]

export const SPRITE_MAP: Record<SpriteKey, SpriteData> = {
  ship: SHIP_SPRITE,
  shipInterceptor: INTERCEPTOR_SPRITE,
  shipDreadnought: DREADNOUGHT_SPRITE,
  shipCarrier: CARRIER_SPRITE,
  drone: DRONE_SPRITE,
  tank: TANK_SPRITE,
  shooter: SHOOTER_SPRITE,
  swarm: SWARM_SPRITE,
  bomber: BOMBER_SPRITE,
  projectile: PROJECTILE_SPRITE,
  enemyProjectile: ENEMY_PROJECTILE_SPRITE,
  meteor: METEOR_SPRITE,
  meteorite: METEORITE_SPRITE,
  rocket: ROCKET_SPRITE,
  ally: ALLY_SPRITE,
}
