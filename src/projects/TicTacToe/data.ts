import {
  Difficulty,
  GameMode,
  MoveCommit,
  Player,
  PlayerProfile,
  Starter,
  ViewMode,
} from './tic-tac-toe.types'
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

/** How a tap behaves online, named by what happens rather than by the setting's mechanics. */
export const MOVE_COMMIT_LABELS: Record<MoveCommit, string> = {
  [MoveCommit.instant]: 'Play at once',
  [MoveCommit.confirm]: 'Confirm first',
}

export const VIEW_LABELS: Record<ViewMode, string> = {
  [ViewMode.orbit]: 'Cube',
  [ViewMode.fanned]: 'Layers',
}

export const gameCopy = {
  title: '4×4×4 Tic-Tac-Toe',
  tagline: 'Four in a row on a 4×4 board, except the board is a cube with four layers.',
  taglineFun: 'My dad taught me this game. But be warned: It ruins normal tic-tac-toe for you.',

  viewLabel: 'View',
  layerLabel: 'Layer',

  newGame: 'New game',
  undo: 'Undo',
  redo: 'Redo',
  /** What Undo actually takes back: on your own it is the pair, since one step would just hand the turn back. */
  undoTitle: (pair: boolean) =>
    pair ? "Take back your and the computers' last moves" : 'Take back the last move',
  redoTitle: (pair: boolean) =>
    pair ? "Replay your and the computer's last moves" : 'Replay the last move',
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
  starterSwapNote: 'Switch now to trade colours and pieces with the computer.',
  thinking: (name: string) => `${name} is thinking`,
  computerName: 'Computer',
  computerTag: 'computer',

  online: {
    title: 'Online game',
    /** Heads the two ways in, kept apart so opening a room is never confused with entering one. */
    createTitle: 'Create a room',
    joinTitle: 'Join an existing room',
    /** Named for what pressing it does: it opens the settings, and the dialog's own button opens the room. */
    create: 'Set up a room',
    join: 'Join a game',
    findGame: 'Find a game',
    /** Says what actually happens, since half the time it opens a room instead of joining one. */
    findHint: 'Joins an existing open room if possible, otherwise creates a new room.',
    /** Explains the locked opponent control, so a disabled button is not a dead end. */
    modeLocked: 'Leave the room first',
    /** Heads the settings dialog, whether it is about to open a room or change one. */
    settingsTitle: 'Room settings',
    editSettings: 'Edit room settings',
    /** The dialog's confirm button, named for what pressing it does in each case. */
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
    /** Sits under the start button: the settings can still be changed right up until it is pressed. */
    startHint: 'You can change the settings above until you start.',
    /** For the player who joined: the start is the opener's call, so the wait is not a broken button. */
    waitingToStart: 'Waiting for the other player to start',
    opponentLeft: (name: string) => `${name} left the room`,
    /** For a player who walked out before typing a name, where "No name yet left the room" would read badly. */
    opponentLeftUnnamed: 'The other player left the room',
    /** Stands in until a player types a name of their own. */
    unnamed: 'No name yet',
    youTag: '(you)',
    /** Replaces the numbered label: online you only set your own, whichever seat you end up in. */
    yourNameLabel: 'Your name',
    intro: 'Play a friend or a stranger online.',

    /** The local setting for whether a tap sends the move, shown only in an online game. */
    commitLabel: 'Tapping a cell',
    commitHint: 'Double tap, or tap once and confirm, to play a move.',
    confirmMove: 'Confirm move',
    clearMove: 'Clear',
    firstMoveLabel: 'Opening move',
    clockLabel: 'Move time limit',
    openLabel: 'Open to anyone',
    /** Explains what the open toggle does to a room that is waiting. */
    openHint: 'Anyone looking for a game can join this room.',
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

  cellPendingLabel: (layer: number, column: number, row: number) =>
    `Layer ${layer}, column ${column}, row ${row}, your move, waiting to be confirmed`,

  cellLabel: (layer: number, column: number, row: number) =>
    `Layer ${layer}, column ${column}, row ${row}`,
  cellTakenLabel: (layer: number, column: number, row: number, name: string) =>
    `Layer ${layer}, column ${column}, row ${row}, taken by ${name}`,
  focusLayerLabel: (layer: number) => `Show only layer ${layer}`,
  releaseFocusLabel: (layer: number) => `Stop showing only layer ${layer}`,
}
