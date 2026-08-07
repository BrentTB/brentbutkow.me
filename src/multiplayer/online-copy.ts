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

/**
 * The transport wording that reads the same for every game — the room flow, seats, and clock say the
 * same thing whether you are playing Othello or tic-tac-toe. A game spreads this into its
 * `gameCopy.online` and overrides only what is genuinely its own (a board-size line, a game-specific
 * hint), so a fix here reaches every game at once.
 */
export const DEFAULT_ONLINE_COPY: OnlineCopy = {
  title: 'Online game',
  intro: 'Play a friend or a stranger online.',
  connecting: 'Connecting…',
  createTitle: 'Create a room',
  create: 'Set up a room',
  joinTitle: 'Join an existing room',
  findGame: 'Find a game',
  findHint: 'Joins an existing open room if possible, otherwise creates a new room.',
  codeLabel: 'Room code',
  codePlaceholder: 'Enter a code',
  join: 'Join a game',
  openRoom: 'Create the room',
  yourCode: 'Your room code',
  copyLink: 'Copy link',
  copied: 'Copied',
  waiting: 'Waiting for someone to join',
  yourTurn: 'Your move',
  theirTurn: 'Their move',
  timeLeft: (clock: string) => `${clock} left`,
  opponentLeft: (name: string) => `${name} left the room`,
  opponentLeftUnnamed: 'The other player left the room',
  unnamed: 'No name yet',
  youTag: '(you)',
  editSettings: 'Edit room settings',
  saveSettings: 'Save settings',
  settingsTitle: 'Room settings',
  cancel: 'Cancel',
  playAgain: 'Play again',
  startGame: 'Start game',
  startHint: 'You can change the settings above until you start.',
  waitingToStart: 'Waiting for the other player to start',
  leave: 'Leave game',
  firstMoveLabel: 'Opening move',
  clockLabel: 'Move time limit',
  openLabel: 'Open to anyone',
  openHint: 'Anyone looking for a game can join this room.',
  openYes: 'Anyone can join',
  openNo: 'Code only',
}
