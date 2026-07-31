import { CSSProperties } from 'react'

/**
 * An inline style that may also carry CSS custom properties. React's own `CSSProperties` rejects
 * `--foo` keys, and the board passes most of its geometry to CSS that way.
 */
export type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>

/** A player's slot. Values double as runtime identifiers for lookups and data attributes. */
export const Player = {
  one: 'one',
  two: 'two',
} as const
export type Player = (typeof Player)[keyof typeof Player]

/** How the four layers are arranged on screen. */
export const ViewMode = {
  /** One cube you can rotate, layers stacked on rods. */
  orbit: 'orbit',
  /** Four separated plates at a fixed angle, like a fanned deck. */
  fanned: 'fanned',
} as const
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode]

/** Who the second seat belongs to. */
export const GameMode = {
  onePlayer: 'onePlayer',
  twoPlayer: 'twoPlayer',
} as const
export type GameMode = (typeof GameMode)[keyof typeof GameMode]

/** How well the computer plays. */
export const Difficulty = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  godly: 'godly',
} as const
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

/** Who takes the first move in a one-player game. */
export const Starter = {
  you: 'you',
  computer: 'computer',
} as const
export type Starter = (typeof Starter)[keyof typeof Starter]

/** An occupied cell holds a player; an empty one holds nothing. */
type Cell = Player | null

/** The whole board, flat, indexed by `cellIndex`. */
export type Board = readonly Cell[]

/** A lattice site: column, row, and which of the four layers. */
export type Coord = {
  x: number
  y: number
  layer: number
}

/** A point in the board's own space, before the camera rotates it. */
export type Vec3 = {
  x: number
  y: number
  z: number
}

/** The four cells that ended the game, and who owns them. */
export type WinLine = {
  player: Player
  cells: readonly number[]
}

/** Where the camera is looking from. */
export type Camera = {
  yaw: number
  pitch: number
  zoom: number
}

/** The two players' display settings. */
export type PlayerProfile = {
  name: string
  /** Comma-separated RGB channels, so SCSS can wrap it in `rgba(..., alpha)`. */
  rgb: string
}
