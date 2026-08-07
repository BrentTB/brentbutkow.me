import {
  BoardSize,
  Difficulty,
  FlipSpeed,
  GameMode,
  MoveCommit,
  Player,
  PlayerProfile,
  Starter,
} from './othello.types'
import { boardSizeFor } from './online'
import { DEFAULT_ONLINE_COPY } from '../../multiplayer/online-copy'

/** Longest a player name can be. Keeps the turn line on one row on a phone. */
export const MAX_NAME_LENGTH = 14

/** The two seats, in the order they are shown and played. Dark opens, by convention. */
export const PLAYER_SLOTS: readonly Player[] = [Player.dark, Player.light]

export const DEFAULT_PLAYERS: Record<Player, PlayerProfile> = {
  [Player.dark]: { name: 'Dark' },
  [Player.light]: { name: 'Light' },
}

export const MODE_LABELS: Record<GameMode, string> = {
  [GameMode.onePlayer]: '1 player',
  [GameMode.twoPlayer]: '2 players',
  [GameMode.online]: 'Online',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.beginner]: 'Beginner',
  [Difficulty.intermediate]: 'Intermediate',
  [Difficulty.hard]: 'Hard',
}

/** Who you are up against, so the choice is not a guess. */
export const DIFFICULTY_BLURBS: Record<Difficulty, string> = {
  [Difficulty.beginner]: 'A beginner, still learning the ropes.',
  [Difficulty.intermediate]: 'Will give you a speed-walk for your money.',
  [Difficulty.hard]: 'Don’t be shocked if you end up with nothing.',
}

export const STARTER_LABELS: Record<Starter, string> = {
  [Starter.you]: 'You',
  [Starter.computer]: 'Computer',
}

export const BOARD_SIZE_LABELS: Record<BoardSize, string> = {
  [BoardSize.small]: '6×6',
  [BoardSize.standard]: '8×8',
  [BoardSize.large]: '10×10',
}

/** The board dimensions on offer, in the order they are shown — the real game in the middle. */
export const BOARD_SIZES: readonly BoardSize[] = [
  BoardSize.small,
  BoardSize.standard,
  BoardSize.large,
]

/** What each size is like to play, so the choice means something. */
export const BOARD_SIZE_BLURBS: Record<BoardSize, string> = {
  [BoardSize.small]: 'A quicker game on a smaller board.',
  [BoardSize.standard]: 'The real game.',
  [BoardSize.large]: 'A longer game, with more room to turn things around.',
}

/** How a tap behaves online, named by what happens rather than by the setting's mechanics. */
export const MOVE_COMMIT_LABELS: Record<MoveCommit, string> = {
  [MoveCommit.instant]: 'Play at once',
  [MoveCommit.confirm]: 'Confirm first',
}

/** How fast captured discs turn over. */
export const FLIP_SPEED_LABELS: Record<FlipSpeed, string> = {
  [FlipSpeed.fast]: 'Fast',
  [FlipSpeed.slow]: 'Slow',
}

export const gameCopy = {
  title: 'Othello',
  tagline:
    'Trap a line of your opponent’s discs and they all flip to your colour. Most discs when the board fills wins.',
  taglineFun: 'One move can turn half the board. So can theirs. Try not to gloat too early.',

  boardSizeLabel: 'Board',
  flipSpeedLabel: 'Flip speed',

  newGame: 'New game',
  undo: 'Undo',
  redo: 'Redo',
  /** What Undo takes back: on your own it is the pair, since one step would just hand the turn back. */
  undoTitle: (pair: boolean) =>
    pair ? 'Take back your and the computer’s last moves' : 'Take back the last move',
  redoTitle: (pair: boolean) =>
    pair ? 'Replay your and the computer’s last moves' : 'Replay the last move',

  turn: (name: string) => `${name} to play`,
  wins: (name: string) => `${name} wins`,
  tie: 'Board full, level pegging',
  /** When a side has no legal move and forfeits its turn. */
  passed: (name: string) => `${name} has no move and passes`,

  gameTitle: 'Game',
  opponentLabel: 'Opponent',
  difficultyLabel: 'Difficulty',
  starterLabel: 'First move',
  /** Shown once there are discs on the board, where switching hands your colour to the computer. */
  starterSwapNote: 'Switch now to trade colours with the computer.',
  thinking: (name: string) => `${name} is thinking`,
  computerName: 'Computer',

  /** The live tally beside the board. */
  scoreLabel: (name: string, count: number) => `${name}: ${count}`,

  online: {
    // The room flow, seats, and clock read the same for every game — see DEFAULT_ONLINE_COPY.
    ...DEFAULT_ONLINE_COPY,

    modeLocked: 'Leave the room first',
    yourNameLabel: 'Your name',

    boardSizeLabel: 'Board size',
    /** The room's board size, read off its cell count, for the read-only settings a guest is shown. */
    boardSizeSummary: (cellCount: number): string | null => {
      const size = boardSizeFor(cellCount)
      return size === null ? null : BOARD_SIZE_LABELS[size]
    },

    /** The local setting for whether a tap sends the move, shown only in an online game. */
    commitLabel: 'Tapping a cell',
    commitHintInstant: 'Tap once to play a move immediately.',
    commitHint: 'Tap a cell to aim, then tap it again to play it.',
    /** The turn line once the clock decides it, and when the other player walks out. */
    wonOnTime: (name: string) => `${name} wins, the clock ran out`,
    wonByDefault: (name: string) => `${name} wins, the other player left`,
  },

  playersTitle: 'Players',
  nameLabel: (slot: number) => `Player ${slot} name`,

  boardLabel: (size: number) => `Othello board, ${size} by ${size}`,
  cellLabel: (row: number, column: number) => `Row ${row}, column ${column}`,
  cellLegalLabel: (row: number, column: number, name: string) =>
    `Row ${row}, column ${column}, legal move for ${name}`,
  cellPendingLabel: (row: number, column: number) =>
    `Row ${row}, column ${column}, aimed, tap again to play`,
  cellTakenLabel: (row: number, column: number, name: string) =>
    `Row ${row}, column ${column}, ${name}`,
}
