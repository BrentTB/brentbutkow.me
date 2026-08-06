/**
 * The wording the shared online panel needs, supplied by each game so the transport UI stays
 * game-agnostic while still reading in the game's own voice. A game's `gameCopy.online` object carries
 * these (and may carry more — extra fields are fine).
 */
export interface OnlineCopy {
  title: string
  intro: string
  connecting: string

  // Pre-connection: the two ways into a room.
  createTitle: string
  create: string
  joinTitle: string
  findGame: string
  findHint: string
  codeLabel: string
  codePlaceholder: string
  join: string
  openRoom: string

  // The room code and the button that shares it.
  yourCode: string
  copyLink: string
  copied: string

  // Whose move it is, and the clock.
  waiting: string
  yourTurn: string
  theirTurn: string
  timeLeft: (clock: string) => string

  // Seats.
  opponentLeft: (name: string) => string
  opponentLeftUnnamed: string
  unnamed: string
  youTag: string

  // Settings and starting.
  editSettings: string
  saveSettings: string
  settingsTitle: string
  cancel: string
  playAgain: string
  startGame: string
  startHint: string
  waitingToStart: string
  leave: string

  // The room's terms, shown read-only and edited in the dialog.
  firstMoveLabel: string
  clockLabel: string
  openLabel: string
  openHint: string
  openYes: string
  openNo: string

  /** The label for the board-size line, present only for a game whose size can vary. */
  boardSizeLabel?: string
  /**
   * The board-size value in the read-only room settings, given the room's cell count. Games with a
   * single board size return null (or omit this) and the line is left out; a game whose size varies
   * (Othello) returns the size so a guest matched into it can see what they are playing.
   */
  boardSizeSummary?: (cellCount: number) => string | null
}
