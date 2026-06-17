export type SpriteData = (string | null)[][]

// A multi-frame sprite: equal-size frames shown `frameDuration` seconds each.
// The cache pre-rasterizes every frame; the renderer selects one from elapsed
// time (see pickFrame). Used for the enemy death disintegration.
export type SpriteAnimation = { frames: SpriteData[]; frameDuration: number }

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
const P = '#8855cc' // purple
const p = '#663399' // dark purple
const X = '#ff66cc'
const x = '#cc3399'
const N = '#88ff44' // radioactive green
const n = '#447722'
const M = '#cc44aa' // magenta
const m = '#993377' // dark magenta
const O = '#dd6622' // dark orange
const o = '#aa4411' // burnt orange

const A = '#44ee44' // bright green (friendly)
const a = '#22aa22' // dark green

// Arrowhead fighter — cyan canopy behind the nose, light keel stripe down the
// spine, delta wings with shaded trailing edges, twin engine nozzles.
export const SHIP_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, D, D, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, D, D, G, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, C, C, G, _, _, _, _, _, _],
  [_, _, _, _, _, G, D, C, C, D, G, _, _, _, _, _],
  [_, _, _, _, _, G, D, W, W, D, G, _, _, _, _, _],
  [_, _, _, _, _, G, G, D, D, G, G, _, _, _, _, _],
  [_, _, _, _, G, G, G, D, D, G, G, G, _, _, _, _],
  [_, _, _, G, G, g, G, D, D, G, g, G, G, _, _, _],
  [_, _, G, G, g, g, G, D, D, G, g, g, G, G, _, _],
  [_, G, G, g, g, G, G, D, D, G, G, g, g, G, G, _],
  [G, G, g, g, G, G, G, D, D, G, G, G, g, g, G, G],
  [G, g, _, _, g, G, G, G, G, G, G, g, _, _, g, G],
  [_, _, _, _, _, g, G, G, G, G, g, _, _, _, _, _],
  [_, _, _, _, _, g, g, G, G, g, g, _, _, _, _, _],
  [_, _, _, _, _, g, F, g, g, F, g, _, _, _, _, _],
  [_, _, _, _, _, _, F, _, _, F, _, _, _, _, _, _],
]

// Clawed grabber — pincer arms hook in toward the nose, white eye band on a
// dark carapace, body tapers to a tail so direction reads at a glance.
export const DRONE_SPRITE: SpriteData = [
  [_, _, _, _, R, R, _, _, _, _, R, R, _, _, _, _],
  [_, _, _, R, r, R, _, _, _, _, R, r, R, _, _, _],
  [_, _, R, r, R, _, _, _, _, _, _, R, r, R, _, _],
  [_, _, R, r, R, _, _, _, _, _, _, R, r, R, _, _],
  [_, _, R, r, R, _, R, R, R, R, _, R, r, R, _, _],
  [_, _, _, R, r, R, r, B, B, r, R, r, R, _, _, _],
  [_, _, _, _, R, r, B, W, W, B, r, R, _, _, _, _],
  [_, _, _, _, R, r, B, B, B, B, r, R, _, _, _, _],
  [_, _, _, _, _, R, r, r, r, r, R, _, _, _, _, _],
  [_, _, _, _, _, _, R, R, R, R, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, R, R, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

export const _OLD_DRONE_SPRITE: SpriteData = [
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
// Bulky steel diamond — heavy plating with twin red sensor clusters.
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

// Gold energy bolt — white-hot cross core inside a gold diamond halo.
export const PROJECTILE_SPRITE: SpriteData = [
  [_, _, G, _, _],
  [_, G, W, G, _],
  [G, W, W, W, G],
  [_, G, W, G, _],
  [_, _, G, _, _],
]

// Irregular molten rock — lumpy silhouette with ember cracks instead of a
// concentric bullseye.
export const METEOR_SPRITE: SpriteData = [
  [_, _, F, F, R, _, _, _],
  [_, F, R, r, r, R, _, _],
  [F, R, r, r, F, r, R, _],
  [F, r, r, F, r, r, r, R],
  [R, r, F, r, r, r, r, F],
  [_, R, r, r, r, F, r, F],
  [_, F, R, r, r, r, R, _],
  [_, _, F, R, R, F, _, _],
]

// Small jagged fragment of the meteor — same molten-rock palette.
export const METEORITE_SPRITE: SpriteData = [
  [_, F, R, _, _],
  [F, r, r, R, _],
  [R, r, F, r, F],
  [_, R, r, r, F],
  [_, _, F, R, _],
]

// Gun platform — central forward cannon flanked by two side barrels, glowing
// cyan-cored eye in a diamond body. The barrels make "ranged" readable next
// to the drone (clawed) and the tank (bulky wedge).
export const SHOOTER_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, p, p, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, P, P, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, p, P, P, p, _, _, _, _, _, _],
  [_, _, p, _, _, _, p, P, P, p, _, _, _, p, _, _],
  [_, _, P, _, _, P, P, P, P, P, P, _, _, P, _, _],
  [_, _, P, _, P, P, p, P, P, p, P, P, _, P, _, _],
  [_, _, P, P, P, p, P, C, C, P, p, P, P, P, _, _],
  [_, _, P, P, p, P, C, W, W, C, P, p, P, P, _, _],
  [_, _, P, P, p, P, C, W, W, C, P, p, P, P, _, _],
  [_, _, _, P, P, p, P, C, C, P, p, P, P, _, _, _],
  [_, _, _, _, P, P, p, P, P, p, P, P, _, _, _, _],
  [_, _, _, _, _, P, P, P, P, P, P, _, _, _, _, _],
  [_, _, _, _, _, P, P, p, p, P, P, _, _, _, _, _],
  [_, _, _, _, _, _, P, p, p, P, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, P, P, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
]

// Red bolt with a white-hot core — sized up so incoming fire tracks easily.
export const ENEMY_PROJECTILE_SPRITE: SpriteData = [
  [_, _, R, _, _],
  [_, R, F, R, _],
  [R, F, W, F, R],
  [_, R, F, R, _],
  [_, _, R, _, _],
]

// Tumbling magenta mote with red flecks — chaotic-looking in packs.
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

// Wasp dart — white eye band behind the nose, flared mid wings, dark tail
// tip. Reserved for a future enemy kind.
export const _NEW_SWARM_SPRITE: SpriteData = [
  [_, _, _, M, M, _, _, _],
  [_, _, M, m, m, M, _, _],
  [_, M, m, W, W, m, M, _],
  [M, m, m, m, m, m, m, M],
  [M, M, m, m, m, m, M, M],
  [_, M, M, m, m, M, M, _],
  [_, _, _, M, M, _, _, _],
  [_, _, _, m, m, _, _, _],
]

// Naval contact mine — dark round shell with eight protruding fuse horns
// (dark base, fire-bright tip) and a red payload window glowing white-hot at
// the center. The spiky silhouette + lit core say "touch this and it blows".
export const BOMBER_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, O, O, _, _, _, _, _, _, _],
  [_, _, F, _, _, _, _, o, o, _, _, _, _, F, _, _],
  [_, _, _, o, _, o, o, o, o, o, o, _, o, _, _, _],
  [_, _, _, _, o, o, o, o, o, o, o, o, _, _, _, _],
  [_, _, _, o, o, O, O, O, O, O, O, o, o, _, _, _],
  [_, _, _, o, o, O, R, R, R, R, O, o, o, _, _, _],
  [F, O, o, o, o, O, R, W, W, R, O, o, o, o, O, F],
  [F, O, o, o, o, O, R, W, W, R, O, o, o, o, O, F],
  [_, _, _, o, o, O, R, R, R, R, O, o, o, _, _, _],
  [_, _, _, o, o, O, O, O, O, O, O, o, o, _, _, _],
  [_, _, _, _, o, o, o, o, o, o, o, o, _, _, _, _],
  [_, _, _, o, _, o, o, o, o, o, o, _, o, _, _, _],
  [_, _, F, _, _, _, _, o, o, _, _, _, _, F, _, _],
  [_, _, _, _, _, _, _, O, O, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _],
]

// Small rocket sprite, drawn rotated to its velocity. 5×12 — white nose cap,
// red warhead band, side-lit body (light on the left), fins, exhaust plume.
export const ROCKET_SPRITE: SpriteData = [
  [_, _, W, _, _],
  [_, R, R, R, _],
  [_, D, G, g, _],
  [_, D, G, g, _],
  [_, D, G, g, _],
  [_, D, G, g, _],
  [_, D, G, g, _],
  [G, D, G, g, G],
  [G, _, F, _, G],
  [_, F, F, F, _],
  [_, F, W, F, _],
  [_, _, F, _, _],
]

// Interceptor: needle dart — long canopy up front, thin fuselage with a light
// keel stripe, blade wings separated from the body by a notch, and a single
// flared afterburner. Speed shows in the sweep and the gap, not bulk.
export const INTERCEPTOR_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, D, D, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, G, G, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, D, D, G, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, C, C, G, _, _, _, _, _, _],
  [_, _, _, _, _, _, G, C, C, G, _, _, _, _, _, _],
  [_, _, _, _, _, G, G, W, W, G, G, _, _, _, _, _],
  [_, _, _, _, _, G, g, D, D, g, G, _, _, _, _, _],
  [_, _, _, _, _, G, g, D, D, g, G, _, _, _, _, _],
  [_, _, _, _, G, G, g, D, D, g, G, G, _, _, _, _],
  [_, _, G, G, G, g, g, D, D, g, g, G, G, G, _, _],
  [G, G, g, g, _, G, G, D, D, G, G, _, g, g, G, G],
  [G, g, _, _, _, G, g, D, D, g, G, _, _, _, g, G],
  [_, _, _, _, _, G, G, G, G, G, G, _, _, _, _, _],
  [_, _, _, _, _, _, g, G, G, g, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, F, F, F, F, _, _, _, _, _, _],
]

// Dreadnought: broad battleship — gold hull carrying heavy steel side pods,
// a wide cyan bridge canopy at the prow, and a triple-engine stern.
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

// Carrier: trimaran gunship — its identity is "fields 3 weapons at once", so
// the silhouette is three parallel gun barrels: a longer spinal cannon up the
// middle and one on each side pod, all with light-gold muzzle tips. Wide
// weapons-platform deck, three exhaust groups astern (one per mount).
export const CARRIER_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, D, D, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, G, G, _, _, _, _, _, _, _],
  [_, _, D, D, _, _, g, G, G, g, _, _, D, D, _, _],
  [_, _, G, G, _, _, g, G, G, g, _, _, G, G, _, _],
  [_, _, G, G, _, _, G, C, C, G, _, _, G, G, _, _],
  [_, _, G, G, _, _, G, C, C, G, _, _, G, G, _, _],
  [_, g, G, G, g, G, G, W, W, G, G, g, G, G, g, _],
  [g, G, G, G, G, G, G, G, G, G, G, G, G, G, G, g],
  [g, G, g, G, G, g, G, G, G, G, g, G, G, g, G, g],
  [g, G, g, G, G, g, G, D, D, G, g, G, G, g, G, g],
  [_, g, G, G, G, g, G, D, D, G, g, G, G, G, g, _],
  [_, g, G, G, G, g, G, G, G, G, g, G, G, G, g, _],
  [_, _, g, G, G, g, G, G, G, G, g, G, G, g, _, _],
  [_, _, _, F, F, _, g, G, G, g, _, F, F, _, _, _],
  [_, _, _, _, _, _, g, F, F, g, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _],
]

// Ally fighter — mini green dart with a white cockpit and engine spark, a
// clear step up from a bare triangle while staying tiny.
export const ALLY_SPRITE: SpriteData = [
  [_, _, _, A, _, _, _],
  [_, _, A, W, A, _, _],
  [_, A, a, A, a, A, _],
  [A, a, A, A, A, a, A],
  [_, _, a, A, a, _, _],
  [_, _, _, F, _, _, _],
]

// Slim homing missile — drawn rotated to velocity (nose up at rotation 0).
// White tip, red warhead, steel body darkening toward tail fins, exhaust.
export const MISSILE_SPRITE: SpriteData = [
  [_, W, _],
  [_, R, _],
  [_, T, _],
  [_, T, _],
  [_, t, _],
  [T, t, T],
  [T, F, T],
  [_, F, _],
]

// Fast magenta orb used by the ricochet weapon — visually distinct from the
// default bullet (gold) and the laser beam.

export const RICOCHET_SPRITE: SpriteData = [
  [_, X, X, X, _],
  [X, W, W, x, X],
  [X, W, x, x, X],
  [X, x, x, x, X],
  [_, X, X, X, _],
]

// Big slow shell — white nose cone, radioactive-green body with a red hazard
// band at its heart, finned tail and exhaust.

export const NUKE_SPRITE: SpriteData = [
  [_, _, W, W, _, _],
  [_, W, W, W, W, _],
  [_, n, N, N, n, _],
  [n, N, N, N, N, n],
  [n, N, R, R, N, n],
  [n, N, R, R, N, n],
  [n, N, N, N, N, n],
  [n, n, N, N, n, n],
  [n, F, F, F, F, n],
  [_, _, F, F, _, _],
]

// Dreadnought Boss (20×20) — octagonal fortress: concentric steel plate
// rings around a purple reactor housing with a glowing white core, four red
// armor spikes at the compass points, and a pair of red-tipped laser turrets
// flanking each spike so its incoming fire reads as sourced, not magic.
export const DREADNOUGHT_BOSS_SPRITE: SpriteData = [
  [_, _, _, _, _, _, R, _, _, R, R, _, _, R, _, _, _, _, _, _],
  [_, _, _, _, _, _, T, _, R, R, R, R, _, T, _, _, _, _, _, _],
  [_, _, _, _, _, t, t, t, t, R, R, t, t, t, t, _, _, _, _, _],
  [_, _, _, _, t, T, T, T, T, T, T, T, T, T, T, t, _, _, _, _],
  [_, _, _, t, T, T, t, t, t, R, R, t, t, t, T, T, t, _, _, _],
  [_, _, t, T, T, t, T, T, T, T, T, T, T, T, t, T, T, t, _, _],
  [R, T, t, T, t, T, T, P, P, P, P, P, P, T, T, t, T, t, T, R],
  [_, t, T, t, T, T, P, p, p, p, p, p, p, P, T, T, t, T, t, _],
  [_, t, T, t, T, P, p, p, W, W, W, W, p, p, P, T, t, T, t, _],
  [R, R, T, t, T, P, p, W, W, W, W, W, W, p, P, T, t, T, R, R],
  [R, R, T, t, T, P, p, W, W, W, W, W, W, p, P, T, t, T, R, R],
  [_, t, T, t, T, P, p, p, W, W, W, W, p, p, P, T, t, T, t, _],
  [_, t, T, t, T, T, P, p, p, p, p, p, p, P, T, T, t, T, t, _],
  [R, T, t, T, t, T, T, P, P, P, P, P, P, T, T, t, T, t, T, R],
  [_, _, t, T, T, t, T, T, T, T, T, T, T, T, t, T, T, t, _, _],
  [_, _, _, t, T, T, t, t, t, R, R, t, t, t, T, T, t, _, _, _],
  [_, _, _, _, t, T, T, T, T, T, T, T, T, T, T, t, _, _, _, _],
  [_, _, _, _, _, t, t, t, t, R, R, t, t, t, t, _, _, _, _, _],
  [_, _, _, _, _, _, T, _, R, R, R, R, _, T, _, _, _, _, _, _],
  [_, _, _, _, _, _, R, _, _, R, R, _, _, R, _, _, _, _, _, _],
]

// Shield Generator (12×12) — dumbbell emitter: a domed steel oval cap at
// each end with an oval pocket of shield energy (cyan shell, white-hot core)
// bulging between them. The glowing C mouths on the caps' inner faces mark
// where the energy emits. Symmetric both ways so its orbit rotation never
// looks wrong.
export const SHIELD_GENERATOR_SPRITE: SpriteData = [
  [_, _, _, t, T, T, T, T, t, _, _, _],
  [_, t, T, T, T, T, T, T, T, T, t, _],
  [_, _, t, t, C, C, C, C, t, t, _, _],
  [_, _, _, _, C, C, C, C, _, _, _, _],
  [_, _, _, C, C, W, W, C, C, _, _, _],
  [_, _, _, C, W, R, r, W, C, _, _, _],
  [_, _, _, C, W, r, R, W, C, _, _, _],
  [_, _, _, C, C, W, W, C, C, _, _, _],
  [_, _, _, _, C, C, C, C, _, _, _, _],
  [_, _, t, t, C, C, C, C, t, t, _, _],
  [_, t, T, T, T, T, T, T, T, T, t, _],
  [_, _, _, t, T, T, T, T, t, _, _, _],
]

// Void Worm head (20×20) — serpent skull, nose up so velocity rotation points
// it along its path. Magenta crest tip, purple hide, glowing red eyes, dark
// open maw with white fangs, tapering into the neck the body chain follows.
export const VOID_WORM_BOSS_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, _, _, M, M, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, m, M, M, m, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, m, P, P, P, P, m, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, m, P, P, P, P, P, P, m, _, _, _, _, _, _],
  [_, _, _, _, _, m, P, P, P, P, P, P, P, P, m, _, _, _, _, _],
  [_, _, _, _, m, P, P, R, R, P, P, R, R, P, P, m, _, _, _, _],
  [_, _, _, _, m, P, P, R, W, P, P, W, R, P, P, m, _, _, _, _],
  [_, _, _, m, P, P, P, P, P, P, P, P, P, P, P, P, m, _, _, _],
  [_, _, _, m, P, p, P, P, P, P, P, P, P, P, p, P, m, _, _, _],
  [_, _, _, m, P, p, p, P, P, P, P, P, P, p, p, P, m, _, _, _],
  [_, _, _, _, m, P, P, B, B, B, B, B, B, P, P, m, _, _, _, _],
  [_, _, _, _, m, P, B, W, B, B, B, B, W, B, P, m, _, _, _, _],
  [_, _, _, _, _, m, P, B, B, B, B, B, B, P, m, _, _, _, _, _],
  [_, _, _, _, _, m, P, P, B, B, B, B, P, P, m, _, _, _, _, _],
  [_, _, _, _, _, _, m, P, P, P, P, P, P, m, _, _, _, _, _, _],
  [_, _, _, _, _, _, m, P, p, P, P, p, P, m, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, m, P, p, p, P, m, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, m, p, P, P, p, m, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, m, p, p, m, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, m, m, _, _, _, _, _, _, _, _, _],
]

// Worm body segment (10×14) — capsule with its long axis along the chain
// (nose-up, rotated to the segment's chain-direction vel). Taller than the
// 30px segment spacing so neighbours overlap and the body reads as one tube.
export const WORM_SEGMENT_SPRITE: SpriteData = [
  [_, _, _, m, m, m, m, _, _, _],
  [_, m, m, P, P, P, P, m, m, _],
  [_, m, P, p, p, p, p, P, m, _],
  [m, P, p, M, M, M, M, p, P, m],
  [m, P, p, M, M, M, M, p, P, m],
  [m, P, p, M, M, M, M, p, P, m],
  [m, P, p, M, B, B, M, p, P, m],
  [m, P, p, M, B, B, M, p, P, m],
  [m, P, p, M, M, M, M, p, P, m],
  [m, P, p, M, M, M, M, p, P, m],
  [m, P, p, M, M, M, M, p, P, m],
  [_, m, P, p, p, p, p, P, m, _],
  [_, m, m, P, P, P, P, m, m, _],
  [_, _, _, m, m, m, m, _, _, _],
]

// Phase Shifter (20×20) — mid-teleport crystal: all four tips of its steel
// octagon have sheared off and float free across a spark-lit gap, with cyan
// energy glowing at every break line. A white slit eye glares from a dark
// socket, and four magenta brood pods sit in the plating — the same magenta
// as the swarms it scatters when it blinks onto you. It never moves under
// its own velocity, so it draws at a fixed rotation.
export const PHASE_SHIFTER_BOSS_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, _, _, C, C, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, C, W, W, C, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, C, _, _, _, _, C, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, t, C, C, C, C, t, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, t, T, T, C, C, T, T, t, _, _, _, _, _, _],
  [_, _, _, _, _, t, m, M, m, T, T, m, M, m, t, _, _, _, _, _],
  [_, _, _, _, t, T, M, X, M, T, T, M, X, M, T, t, _, _, _, _],
  [_, _, C, t, T, T, m, M, m, T, T, m, M, m, T, T, t, C, _, _],
  [_, C, _, C, T, T, t, B, B, B, B, B, B, t, T, T, C, _, C, _],
  [C, W, _, C, T, t, W, W, W, B, B, W, W, W, t, T, C, _, W, C],
  [C, W, _, C, T, t, W, W, W, B, B, W, W, W, t, T, C, _, W, C],
  [_, C, _, C, T, T, t, B, B, B, B, B, B, t, T, T, C, _, C, _],
  [_, _, C, t, T, T, m, M, m, T, T, m, M, m, T, T, t, C, _, _],
  [_, _, _, _, t, T, M, X, M, T, T, M, X, M, T, t, _, _, _, _],
  [_, _, _, _, _, t, m, M, m, T, T, m, M, m, t, _, _, _, _, _],
  [_, _, _, _, _, _, t, T, T, C, C, T, T, t, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, t, C, C, C, C, t, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, C, _, _, _, _, C, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, C, W, W, C, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, C, C, _, _, _, _, _, _, _, _, _],
]

// Dasher — an aggressive orange dart: swept wings, twin exhausts, a red core.
// The renderer points it along its velocity, so the nose leads the charge.
export const DASHER_SPRITE: SpriteData = [
  [_, _, _, _, _, F, _, _, _, _, _],
  [_, _, _, _, F, O, F, _, _, _, _],
  [_, _, _, F, O, O, O, F, _, _, _],
  [_, _, F, O, o, o, o, O, F, _, _],
  [_, _, F, O, o, R, o, O, F, _, _],
  [_, F, O, o, R, R, R, o, O, F, _],
  [_, F, O, o, R, R, R, o, O, F, _],
  [F, O, o, o, o, o, o, o, o, O, F],
  [F, O, o, O, _, _, _, O, o, O, F],
  [O, o, O, _, _, _, _, _, O, o, O],
  [o, O, _, _, _, _, _, _, _, O, o],
  [_, O, _, _, _, _, _, _, _, O, _],
  [_, o, _, _, _, _, _, _, _, o, _],
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
  dasher: 'dasher',
  dreadnoughtBoss: 'dreadnoughtBoss',
  shieldGenerator: 'shieldGenerator',
  voidWormBoss: 'voidWormBoss',
  wormSegment: 'wormSegment',
  phaseShifterBoss: 'phaseShifterBoss',
  projectile: 'projectile',
  enemyProjectile: 'enemyProjectile',
  meteor: 'meteor',
  meteorite: 'meteorite',
  rocket: 'rocket',
  ally: 'ally',
  missile: 'missile',
  ricochet: 'ricochet',
  nuke: 'nuke',
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
  dasher: DASHER_SPRITE,
  dreadnoughtBoss: DREADNOUGHT_BOSS_SPRITE,
  shieldGenerator: SHIELD_GENERATOR_SPRITE,
  voidWormBoss: VOID_WORM_BOSS_SPRITE,
  wormSegment: WORM_SEGMENT_SPRITE,
  phaseShifterBoss: PHASE_SHIFTER_BOSS_SPRITE,
  projectile: PROJECTILE_SPRITE,
  enemyProjectile: ENEMY_PROJECTILE_SPRITE,
  meteor: METEOR_SPRITE,
  meteorite: METEORITE_SPRITE,
  rocket: ROCKET_SPRITE,
  ally: ALLY_SPRITE,
  missile: MISSILE_SPRITE,
  ricochet: RICOCHET_SPRITE,
  nuke: NUKE_SPRITE,
}

// Generic 4-frame shatter, drawn additively over a dying enemy as it fades. A
// bright core flashes, fragments fling outward, then thin to embers. Reused for
// every enemy (scaled to its size) — the one place Phase 8 authors frame art.
const D1: SpriteData = [
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, F, _, _, _, _],
  [_, _, _, F, W, F, _, _, _],
  [_, _, F, W, W, W, F, _, _],
  [_, F, W, W, W, W, W, F, _],
  [_, _, F, W, W, W, F, _, _],
  [_, _, _, F, W, F, _, _, _],
  [_, _, _, _, F, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
]
const D2: SpriteData = [
  [_, _, _, _, F, _, _, _, _],
  [_, _, F, _, _, _, F, _, _],
  [_, F, _, _, D, _, _, F, _],
  [_, _, _, D, W, D, _, _, _],
  [F, _, D, W, _, W, D, _, F],
  [_, _, _, D, W, D, _, _, _],
  [_, F, _, _, D, _, _, F, _],
  [_, _, F, _, _, _, F, _, _],
  [_, _, _, _, F, _, _, _, _],
]
const D3: SpriteData = [
  [F, _, _, _, _, _, _, _, F],
  [_, O, _, _, F, _, _, O, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, D, _, _, _, _],
  [_, F, _, D, _, D, _, F, _],
  [_, _, _, _, D, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, O, _, _, F, _, _, O, _],
  [F, _, _, _, _, _, _, _, F],
]
const D4: SpriteData = [
  [_, _, _, _, _, _, _, _, _],
  [_, O, _, _, _, _, _, O, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, O, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, O, _, _, _, _, _, O, _],
  [_, _, _, _, _, _, _, _, _],
]

export const AnimationKey = { disintegration: 'disintegration' } as const
export type AnimationKey = (typeof AnimationKey)[keyof typeof AnimationKey]

export const ANIMATION_MAP: Record<AnimationKey, SpriteAnimation> = {
  disintegration: { frames: [D1, D2, D3, D4], frameDuration: 0.065 },
}
