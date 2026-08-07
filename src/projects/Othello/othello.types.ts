/**
 * The two disc colours. Dark opens, by Othello convention. Values double as runtime identifiers for
 * lookups and `data-` attributes.
 */
export const Player = {
  dark: 'dark',
  light: 'light',
} as const
export type Player = (typeof Player)[keyof typeof Player]

/** Who the second seat belongs to. */
export const GameMode = {
  onePlayer: 'onePlayer',
  twoPlayer: 'twoPlayer',
  /** A second person on another machine, joined by a room code. */
  online: 'online',
} as const
export type GameMode = (typeof GameMode)[keyof typeof GameMode]

/** How well the computer plays. */
export const Difficulty = {
  /** Grabs whatever flips the most, blind to corners and traps. */
  beginner: 'beginner',
  /** Values corners, avoids handing them over, but does not look ahead. */
  intermediate: 'intermediate',
  /** Full alpha-beta search. */
  hard: 'hard',
} as const
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

/** Who takes the first move in a one-player game. */
export const Starter = {
  you: 'you',
  computer: 'computer',
} as const
export type Starter = (typeof Starter)[keyof typeof Starter]

/**
 * The board dimensions on offer. Values are the edge length itself, so `BoardSize.standard` is 8 and
 * the whole engine stays size-agnostic — a fun mode only has to hand a different number in.
 */
export const BoardSize = {
  small: 6,
  standard: 8,
  large: 10,
} as const
export type BoardSize = (typeof BoardSize)[keyof typeof BoardSize]

export const isBoardSize = (value: unknown): value is BoardSize =>
  value === BoardSize.small || value === BoardSize.standard || value === BoardSize.large

/**
 * What a tap on a legal cell does online: play the move, or aim one that a second press commits.
 *
 * A local preference, since the opponent only ever sees committed moves. Confirming exists because a
 * committed move online cannot be taken back.
 */
export const MoveCommit = {
  instant: 'instant',
  confirm: 'confirm',
} as const
export type MoveCommit = (typeof MoveCommit)[keyof typeof MoveCommit]

export const isMoveCommit = (value: unknown): value is MoveCommit =>
  value === MoveCommit.instant || value === MoveCommit.confirm

/**
 * How quickly captured discs turn over. A player's own preference, kept in `localStorage`: some like
 * the snap of the fast cascade, some want to watch the line flip.
 */
export const FlipSpeed = {
  fast: 'fast',
  slow: 'slow',
} as const
export type FlipSpeed = (typeof FlipSpeed)[keyof typeof FlipSpeed]

export const isFlipSpeed = (value: unknown): value is FlipSpeed =>
  value === FlipSpeed.fast || value === FlipSpeed.slow

/** An occupied cell holds a player; an empty one holds nothing. */
export type Cell = Player | null

/** The whole board: a flat array read row-major, plus the edge length needed to decode it. */
export type Board = {
  cells: readonly Cell[]
  size: number
}

/** A square on the board. */
export type Coord = {
  row: number
  col: number
}

/**
 * The result of playing a move: the board after it, and the indices of the discs that flipped, grouped
 * by direction and outward within each. Undo replays them; the flip animation staggers by each disc's
 * distance from the placed square (see `Board`), not by this array's order.
 */
export type MoveResult = {
  board: Board
  flipped: number[]
}

/** The final tally. `winner` is null for a tie. */
export type GameOutcome = {
  dark: number
  light: number
  winner: Player | null
}

/** A player's display settings. Othello discs are always dark/light, so only the name is chosen. */
export type PlayerProfile = {
  name: string
}
