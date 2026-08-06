import {
  BoardSize,
  Difficulty,
  FlipSpeed,
  GameMode,
  MoveCommit,
  Player,
  PlayerProfile,
  Starter,
  isBoardSize,
} from './othello.types'

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
  [Difficulty.beginner]: 'A beginner, still working out where the good squares are.',
  [Difficulty.intermediate]: 'A fair fight, as long as you are paying attention.',
  [Difficulty.hard]: 'This one will make you earn every disc.',
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
  passed: (name: string) => `${name} has no move, ${name} passes`,

  gameTitle: 'Game',
  opponentLabel: 'Opponent',
  difficultyLabel: 'Difficulty',
  starterLabel: 'First move',
  /** Shown once there are discs on the board, where switching hands your colour to the computer. */
  starterSwapNote: 'Switch now to trade colours with the computer.',
  thinking: (name: string) => `${name} is thinking`,
  computerName: 'Computer',
  computerTag: 'computer',

  /** The live tally beside the board. */
  scoreLabel: (name: string, count: number) => `${name}: ${count}`,

  online: {
    title: 'Online game',
    createTitle: 'Create a room',
    joinTitle: 'Join an existing room',
    create: 'Set up a room',
    join: 'Join a game',
    findGame: 'Find a game',
    findHint: 'Joins an existing open room if possible, otherwise creates a new room.',
    modeLocked: 'Leave the room first',
    settingsTitle: 'Room settings',
    editSettings: 'Edit room settings',
    openRoom: 'Create the room',
    saveSettings: 'Save settings',
    cancel: 'Cancel',
    openYes: 'Anyone can join',
    openNo: 'Code only',
    codeLabel: 'Room code',
    codePlaceholder: 'Enter a code',
    connecting: 'Connecting…',
    yourCode: 'Your room code',
    copyLink: 'Copy link',
    copied: 'Copied',
    waiting: 'Waiting for someone to join',
    yourTurn: 'Your move',
    theirTurn: 'Their move',
    leave: 'Leave game',
    startGame: 'Start game',
    playAgain: 'Play again',
    startHint: 'You can change the settings above until you start.',
    waitingToStart: 'Waiting for the other player to start',
    opponentLeft: (name: string) => `${name} left the room`,
    opponentLeftUnnamed: 'The other player left the room',
    unnamed: 'No name yet',
    youTag: '(you)',
    yourNameLabel: 'Your name',
    intro: 'Play a friend or a stranger online.',

    /** The local setting for whether a tap sends the move, shown only in an online game. */
    commitLabel: 'Tapping a cell',
    commitHintInstant: 'Tap once to play a move immediately.',
    commitHint: 'Double tap, or tap once and confirm, to play a move.',
    confirmMove: 'Confirm move',
    clearMove: 'Clear',
    firstMoveLabel: 'Opening move',
    clockLabel: 'Move time limit',
    boardSizeLabel: 'Board size',
    /** The room's board size, read off its cell count, for the read-only settings a guest is shown. */
    boardSizeSummary: (cellCount: number): string | null => {
      const size = Math.round(Math.sqrt(cellCount))
      return isBoardSize(size) ? BOARD_SIZE_LABELS[size] : null
    },
    openLabel: 'Open to anyone',
    openHint: 'Anyone looking for a game can join this room.',
    timeLeft: (clock: string) => `${clock} left`,
    /** The turn line once the clock decides it, and when the other player walks out. */
    wonOnTime: (name: string) => `${name} wins, the clock ran out`,
    wonByDefault: (name: string) => `${name} wins, the other player left`,
  },

  playersTitle: 'Players',
  nameLabel: (slot: number) => `Player ${slot} name`,

  cellLabel: (row: number, column: number) => `Row ${row}, column ${column}`,
  cellLegalLabel: (row: number, column: number, name: string) =>
    `Row ${row}, column ${column}, legal move for ${name}`,
  cellPendingLabel: (row: number, column: number) =>
    `Row ${row}, column ${column}, your move, waiting to be confirmed`,
  cellTakenLabel: (row: number, column: number, name: string) =>
    `Row ${row}, column ${column}, ${name}`,
}
