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

export const SHOOTER_SPRITE: SpriteData = [
  [_, _, _, _, _, P, P, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, P, p, p, P, _, _, _, _, _, _, _, _],
  [_, _, _, P, p, P, P, p, P, _, _, _, _, _, _, _],
  [_, _, P, p, P, _, _, P, p, P, _, _, _, _, _, _],
  [_, P, p, P, _, _, _, _, P, p, P, _, _, _, _, _],
  [_, P, p, R, _, _, _, _, R, p, P, _, _, _, _, _],
  [_, _, P, p, P, _, _, P, p, P, _, _, _, _, _, _],
  [_, _, _, P, p, P, P, p, P, _, _, _, _, _, _, _],
  [_, _, _, _, P, p, p, P, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, P, P, _, _, _, P, P, P, P, _, _],
  [_, _, _, _, _, _, _, _, _, P, p, p, p, p, P, _],
  [_, _, _, _, _, _, _, _, P, p, p, p, p, p, p, P],
  [_, _, _, _, _, _, _, _, P, p, p, p, p, p, p, P],
  [_, _, _, _, _, _, _, _, _, P, p, p, p, p, P, _],
  [_, _, _, _, _, _, _, _, _, _, P, P, P, P, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

export const ENEMY_PROJECTILE_SPRITE: SpriteData = [
  [_, R, _],
  [R, F, R],
  [_, R, _],
]

export type SpriteKey =
  | 'ship'
  | 'drone'
  | 'tank'
  | 'shooter'
  | 'projectile'
  | 'enemyProjectile'
  | 'meteor'
  | 'meteorite'

export const SPRITE_MAP: Record<SpriteKey, SpriteData> = {
  ship: SHIP_SPRITE,
  drone: DRONE_SPRITE,
  tank: TANK_SPRITE,
  shooter: SHOOTER_SPRITE,
  projectile: PROJECTILE_SPRITE,
  enemyProjectile: ENEMY_PROJECTILE_SPRITE,
  meteor: METEOR_SPRITE,
  meteorite: METEORITE_SPRITE,
}
