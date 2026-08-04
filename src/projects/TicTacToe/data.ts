import { Difficulty, GameMode, Player, PlayerProfile, Starter, ViewMode } from './tic-tac-toe.types'
import { BOARD_SIZE, LineDescription, LineShape } from './engine/lines'

/** Longest a player name can be. Keeps the turn line on one row on a phone. */
export const MAX_NAME_LENGTH = 14

/** Colours that hold up against the dark board and stay apart from each other. */
export const PLAYER_COLOURS: readonly PlayerColour[] = [
  { id: 'amber', name: 'Amber', rgb: '233, 164, 84' },
  { id: 'cyan', name: 'Cyan', rgb: '104, 200, 216' },
  { id: 'rose', name: 'Rose', rgb: '226, 122, 142' },
  { id: 'lime', name: 'Lime', rgb: '154, 200, 118' },
  { id: 'violet', name: 'Violet', rgb: '168, 148, 226' },
  { id: 'sand', name: 'Sand', rgb: '214, 202, 170' },
]

type PlayerColour = {
  id: string
  name: string
  rgb: string
}

/** The two seats, in the order they are shown and played. */
export const PLAYER_SLOTS: readonly Player[] = [Player.one, Player.two]

export const DEFAULT_PLAYERS: Record<Player, PlayerProfile> = {
  [Player.one]: { name: 'Player 1', rgb: PLAYER_COLOURS[0].rgb },
  [Player.two]: { name: 'Player 2', rgb: PLAYER_COLOURS[1].rgb },
}

export const MODE_LABELS: Record<GameMode, string> = {
  [GameMode.onePlayer]: '1 player',
  [GameMode.twoPlayer]: '2 players',
  [GameMode.online]: 'Online',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.easy]: 'Easy',
  [Difficulty.medium]: 'Medium',
  [Difficulty.hard]: 'Hard',
  [Difficulty.godly]: 'Godly',
}

/** What each setting actually does, so the choice is not a guess. */
export const DIFFICULTY_BLURBS: Record<Difficulty, string> = {
  [Difficulty.easy]: 'A beginner, still working out where to look.',
  [Difficulty.medium]: 'Knows what it is doing. Most of the time.',
  [Difficulty.hard]: 'You will have to earn this one.',
  [Difficulty.godly]: 'Is it even possible to beat this thing?',
}

export const STARTER_LABELS: Record<Starter, string> = {
  [Starter.you]: 'You',
  [Starter.computer]: 'Computer',
}

/** Who opens an online game, from the point of view of whoever is setting the room up. */
export const ONLINE_STARTERS = [
  { seat: 0, label: 'You' },
  { seat: 1, label: 'Them' },
] as const

/**
 * How long a move may take. Unlimited stays first because it is the friendly default; the rest are
 * short enough to keep a game moving in one sitting.
 */
export const MOVE_LIMITS: readonly { seconds: number | null; label: string }[] = [
  { seconds: null, label: 'None' },
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1 min' },
  { seconds: 180, label: '3 min' },
]

export const VIEW_LABELS: Record<ViewMode, string> = {
  [ViewMode.orbit]: 'Cube',
  [ViewMode.fanned]: 'Layers',
}

export const gameCopy = {
  title: '4×4×4 Tic-Tac-Toe',
  tagline: 'Four in a row on a 4×4 board, except the board is a cube four layers deep.',
  taglineFun: 'My dad taught me this one. It ruins normal tic-tac-toe for you.',

  viewLabel: 'View',
  layerLabel: 'Layer',

  newGame: 'New game',
  undo: 'Undo',
  redo: 'Redo',
  /** What Undo actually takes back: on your own it is the pair, since one step would just hand the turn back. */
  undoTitle: (pair: boolean) =>
    pair
      ? 'Take back your last move and the reply to it'
      : 'Take back the last move, or the new game you just started',
  redoTitle: (pair: boolean) =>
    pair ? 'Replay your move and the reply to it' : 'Replay the last move',
  orbitHint: 'Drag to turn the board',
  orbitHintTouch: 'Drag to turn the board, pinch to zoom',
  fannedHint: 'Every layer at once, lowest first',

  turn: (name: string) => `${name} to play`,
  wins: (name: string) => `${name} wins`,
  draw: 'Board full, nobody got four',

  gameTitle: 'Game',
  opponentLabel: 'Opponent',
  difficultyLabel: 'Difficulty',
  starterLabel: 'First move',
  /** Shown once there are pieces on the board, where switching hands your colour to the computer. */
  starterSwapNote: 'Switch now and you trade colours with the computer, pieces and all.',
  thinking: (name: string) => `${name} is thinking`,
  computerName: 'Computer',
  computerTag: 'computer',

  online: {
    title: 'Online game',
    create: 'Start a game',
    join: 'Join a game',
    findGame: 'Find a game',
    /** Says what actually happens, since half the time it opens a room instead of joining one. */
    findHint:
      'Puts you in with whoever is waiting. If nobody is, you wait here until someone turns up.',
    /** Explains the locked opponent control, so a disabled button is not a dead end. */
    modeLocked: 'Leave the room first',
    /** Heads the settings on the setup form, and says plainly which of the buttons below they govern. */
    setupTitle: 'Room settings',
    setupHint: 'Start a game uses these. Find a game only does when nobody is waiting.',
    /** Heads the same settings once you are in a room, where they describe it rather than propose it. */
    roomSettingsTitle: 'This room',
    yoursToChange: 'Yours to change until someone joins.',
    openYes: 'Anyone can join',
    openNo: 'Code only',
    codeLabel: 'Room code',
    codePlaceholder: 'Enter a code',
    connecting: 'Connecting…',
    yourCode: 'Your room code',
    copyLink: 'Copy invite link',
    copied: 'Link copied',
    waiting: 'Waiting for someone to join',
    yourTurn: 'Your move',
    theirTurn: 'Their move',
    leave: 'Leave game',
    playAgain: 'Play again',
    /** Shown after a game, since the opening move changes hands each time. */
    playAgainHint: 'Same room, and the other player starts.',
    opponentLeft: (name: string) => `${name} left the room`,
    /** Stands in until a player types a name of their own. */
    unnamed: 'No name yet',
    youTag: '(you)',
    /** Replaces the numbered label: online you only set your own, whichever seat you end up in. */
    yourNameLabel: 'Your name',
    intro: 'Share the code, take turns. No take-backs once a move is in.',

    firstMoveLabel: 'Opening move',
    clockLabel: 'Move limit',
    openLabel: 'Open to anyone',
    /** Explains what the open toggle does to a room that is waiting. */
    openHint: 'Anyone looking for a game can drop straight into this room.',
    timeLeft: (clock: string) => `${clock} left`,
    /** The turn line once the clock decides it: nobody played, so there is no winning row to describe. */
    wonOnTime: (name: string) => `${name} wins, the clock ran out`,
    wonByDefault: (name: string) => `${name} wins, the other player left`,
  },

  playersTitle: 'Players',
  nameLabel: (slot: number) => `Player ${slot} name`,
  colourLabel: (name: string) => `Colour for ${name}`,
  colourTakenLabel: (colour: string) => `${colour}, taken by the other player`,

  /** How the winning line ran, since four beads in a cube do not read as a line on their own. */
  lineShape: ({ shape, layer }: LineDescription) => {
    switch (shape) {
      case LineShape.flatRow:
        return `straight line in layer ${layer}`
      case LineShape.flatDiagonal:
        return `diagonal in layer ${layer}`
      case LineShape.rod:
        return 'straight up one rod'
      case LineShape.climbing:
        return `diagonal through all ${BOARD_SIZE} layers`
      case LineShape.bodyDiagonal:
        return 'corner to corner'
    }
  },

  cellLabel: (layer: number, column: number, row: number) =>
    `Layer ${layer}, column ${column}, row ${row}`,
  cellTakenLabel: (layer: number, column: number, row: number, name: string) =>
    `Layer ${layer}, column ${column}, row ${row}, taken by ${name}`,
  focusLayerLabel: (layer: number) => `Show only layer ${layer}`,
  releaseFocusLabel: (layer: number) => `Stop showing only layer ${layer}`,
}
