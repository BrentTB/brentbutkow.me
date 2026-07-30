import { Player, PlayerProfile, ViewMode } from './tic-tac-toe.types'

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

export type PlayerColour = {
  id: string
  name: string
  rgb: string
}

export const DEFAULT_PLAYERS: Record<Player, PlayerProfile> = {
  [Player.one]: { name: 'Player 1', rgb: PLAYER_COLOURS[0].rgb },
  [Player.two]: { name: 'Player 2', rgb: PLAYER_COLOURS[1].rgb },
}

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
  undoTitle: 'Step back one move, or undo starting a new game',
  orbitHint: 'Drag to turn the board',
  orbitHintTouch: 'Drag to turn the board, pinch to zoom',
  fannedHint: 'Every layer at once, lowest first',

  turn: (name: string) => `${name} to play`,
  wins: (name: string) => `${name} wins`,
  draw: 'Board full, nobody got four',

  playersTitle: 'Players',
  nameLabel: (slot: number) => `Player ${slot} name`,
  colourLabel: (name: string) => `Colour for ${name}`,

  cellLabel: (layer: number, column: number, row: number) =>
    `Layer ${layer}, column ${column}, row ${row}`,
  cellTakenLabel: (layer: number, column: number, row: number, name: string) =>
    `Layer ${layer}, column ${column}, row ${row}, taken by ${name}`,
  focusLayerLabel: (layer: number) => `Show only layer ${layer}`,
  releaseFocusLabel: (layer: number) => `Stop showing only layer ${layer}`,
}
