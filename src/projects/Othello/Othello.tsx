import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { Connection, useOnlineRoom } from '../../multiplayer/useOnlineRoom'
import { parseRoomInvite } from '../../multiplayer/room-code'
import { loadRoomSession } from '../../multiplayer/room-session'
import { Outcome, RoomStatus } from '../../multiplayer/multiplayer.types'
import {
  BoardSize,
  Difficulty,
  GameMode,
  MoveCommit,
  Player,
  PlayerProfile,
  Starter,
} from './othello.types'
import {
  BOARD_SIZES,
  BOARD_SIZE_LABELS,
  DEFAULT_PLAYERS,
  MAX_NAME_LENGTH,
  PLAYER_SLOTS,
  gameCopy,
} from './data'
import { Rng, seededRng } from '../../utils/rng'
import { opponentOf } from './engine/board'
import { useGame } from './useGame'
import { useComputerTurn } from './useComputerTurn'
import { useMoveCommit } from './useMoveCommit'
import { useFlipSpeed } from './useFlipSpeed'
import {
  OTHELLO_GAME_ID,
  PASS_MOVE,
  acceptsOthelloRoom,
  boardSizeFor,
  cellCodec,
  colourForSeat,
  openingColour,
  othelloCellCount,
  seatSwatchRgb,
} from './online'
import { OnlinePanel } from '../../multiplayer/OnlinePanel/OnlinePanel'
import { BoardClock } from '../../multiplayer/BoardClock'
import { Board } from './components/Board/Board'
import { GameSetup } from './components/GameSetup/GameSetup'
import { ScoreBar } from './components/ScoreBar/ScoreBar'
import styles from './Othello.module.scss'

/** The board sizes the room-settings dialog offers, each as its cell count and label. */
const BOARD_SIZE_OPTIONS = BOARD_SIZES.map((size) => ({
  value: othelloCellCount(size),
  label: BOARD_SIZE_LABELS[size],
}))

/** How long "X passes" stays on the status line before the forced pass is committed. */
const PASS_NOTICE_MS = 750

/** How long typing settles before your name goes to the room, so a rename is one write, not ten. */
const PROFILE_DEBOUNCE_MS = 400

/**
 * Which colour the computer plays in a one-player game. Dark always opens, so choosing "computer" for
 * the first move hands it dark — a real edge on this board.
 */
function computerColour(mode: GameMode, starter: Starter): Player | null {
  if (mode !== GameMode.onePlayer) return null
  return starter === Starter.computer ? Player.dark : Player.light
}

/** An emptied name field falls back to its default rather than leaving the turn line blank. */
function displayName(profile: PlayerProfile, slot: Player): string {
  return profile.name.trim() || DEFAULT_PLAYERS[slot].name
}

/** Whether a name is one of the colour defaults ("Dark"/"Light") rather than one a player typed. */
const isColourName = (name: string): boolean =>
  PLAYER_SLOTS.some((slot) => name === DEFAULT_PLAYERS[slot].name)

/** Names the computer's colour "Computer", and puts the default back when it hands the colour over. */
function retitle(
  players: Record<Player, PlayerProfile>,
  computer: Player | null
): Record<Player, PlayerProfile> {
  const next = { ...players }
  for (const slot of PLAYER_SLOTS) {
    const slotDefault = DEFAULT_PLAYERS[slot].name
    if (slot === computer && next[slot].name === slotDefault) {
      next[slot] = { name: gameCopy.computerName }
    } else if (slot !== computer && next[slot].name === gameCopy.computerName) {
      next[slot] = { name: slotDefault }
    }
  }
  return next
}

interface OthelloProps {
  /** Seeds the computer's choices. A test pins it; left out, a fresh seed is drawn per session. */
  computerSeed?: number
}

export function Othello({ computerSeed }: OthelloProps = {}) {
  const { isFunMode } = useFunMode()

  const [gameMode, setGameMode] = useState<GameMode>(GameMode.twoPlayer)
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.intermediate)
  const [starter, setStarter] = useState<Starter>(Starter.you)
  const [boardSize, setBoardSize] = useState<BoardSize>(BoardSize.standard)
  const [players, setPlayers] = useState<Record<Player, PlayerProfile>>(DEFAULT_PLAYERS)
  /* Your name in an online room, separate from the local pair: online you set only your own, and a
     blank one falls back to your disc colour, so two players who never type a name still read as
     "Dark" and "Light" rather than both defaulting to the same thing. */
  const [myName, setMyName] = useState('')
  const [pending, setPending] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const { commit, choose: chooseCommit } = useMoveCommit()
  const { flipSpeed, choose: chooseFlipSpeed } = useFlipSpeed()

  const computer = computerColour(gameMode, starter)

  const {
    board,
    currentPlayer,
    lastMove,
    flipped,
    skipped,
    outcome,
    counts,
    legalCells,
    mustPass,
    playAt,
    pass,
    newGame,
    resetGame,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGame(boardSize, computer, Player.dark)

  const isOnline = gameMode === GameMode.online

  const room = useOnlineRoom<number>({
    gameId: OTHELLO_GAME_ID,
    cellCount: othelloCellCount(boardSize),
    // Matchmaking pairs across sizes, so a guest may land in a room of another size and adopt it.
    acceptsRoom: acceptsOthelloRoom,
    // Othello passes a turn when a side has no move, riding the wire as -1.
    allowsPass: true,
    codec: cellCodec,
    // A confirmed move — mine echoed back, or the opponent's — lands on the board like any other. A
    // pass (-1) advances the turn without a disc.
    onRemoteMove: (move) => (move === PASS_MOVE ? pass() : playAt(move)),
    // The room opens each game with dark, on a fresh board of the room's own size — which, for a guest,
    // may not be the size this client had picked, so it is read from the room rather than local state.
    onReset: (state) => newGame(openingColour(), boardSizeFor(state.cellCount) ?? boardSize),
  })

  const wasInRoomRef = useRef(false)
  if (room.connection === Connection.connected) wasInRoomRef.current = true

  const [inviteCode, setInviteCode] = useState<string | null>(null)
  useEffect(() => {
    const code = parseRoomInvite(new URLSearchParams(window.location.search))
    if (code !== null) setInviteCode(code)
    if (code !== null || loadRoomSession(OTHELLO_GAME_ID) !== null) setGameMode(GameMode.online)
  }, [])

  // Leaving online mode ends the session so its poll loop can't drop moves onto a local game.
  const leaveRoom = room.leave
  useEffect(() => {
    if (!isOnline && wasInRoomRef.current) leaveRoom()
  }, [isOnline, leaveRoom])

  // Stepping out of a room empties the join field and lets the next room settle its seat afresh.
  const leftRoom = wasInRoomRef.current && room.connection === Connection.idle
  useEffect(() => {
    if (!leftRoom) return
    wasInRoomRef.current = false
    setInviteCode(null)
  }, [leftRoom])

  const computerRng = useRef<Rng>()
  if (!computerRng.current) {
    computerRng.current = seededRng(computerSeed ?? Math.floor(Math.random() * 2 ** 31))
  }

  const { isThinking } = useComputerTurn({
    board,
    computer,
    currentPlayer,
    difficulty,
    finished: outcome !== null,
    rng: computerRng.current,
    play: playAt,
    pass,
  })

  const locked = isOnline
    ? !room.isMyTurn || sending
    : isThinking || (computer !== null && currentPlayer === computer)
  const interactive = !locked && outcome === null

  const submitMove = room.submit
  const aimMove = room.aim
  const sendMove = useCallback(
    async (move: number) => {
      setPending(null)
      setSending(true)
      try {
        // The server runs the Othello judge, so it decides the result; the client's flags are ignored.
        await submitMove(move)
      } finally {
        setSending(false)
      }
    },
    [submitMove]
  )

  const confirming = isOnline && commit === MoveCommit.confirm
  useEffect(() => {
    if (!confirming || locked) setPending(null)
  }, [confirming, locked])

  const handlePlay = useCallback(
    (index: number) => {
      if (locked) return
      if (isOnline) {
        if (confirming) {
          if (pending === index) void sendMove(index)
          else {
            // Aiming also tells the server, so a timeout plays this move instead of forfeiting.
            setPending(index)
            void aimMove(index)
          }
          return
        }
        void sendMove(index)
        return
      }
      playAt(index)
    },
    [locked, isOnline, confirming, pending, sendMove, playAt, aimMove]
  )

  /* A forced pass a local human cannot click away: shown for a beat, then committed. The computer's
     own forced pass is handled inside useComputerTurn, so its turn is left alone here. */
  useEffect(() => {
    if (isOnline || outcome !== null || !mustPass) return
    if (computer !== null && currentPlayer === computer) return
    const settle = window.setTimeout(() => pass(), PASS_NOTICE_MS)
    return () => window.clearTimeout(settle)
  }, [isOnline, outcome, mustPass, computer, currentPlayer, pass])

  /* Online, a side with no move must say so: the pass rides the wire as -1 to keep both clients on the
     same turn. A rejected pass leaves the version unchanged, so gate on it: one attempt per turn, or the
     effect re-fires the instant `sending` clears and hammers the server with no backoff. */
  const passedAtVersionRef = useRef<number | null>(null)
  const roomVersion = room.version
  useEffect(() => {
    if (!isOnline || outcome !== null || sending) return
    if (!room.isMyTurn || !mustPass) return
    if (passedAtVersionRef.current === roomVersion) return
    passedAtVersionRef.current = roomVersion
    void sendMove(PASS_MOVE)
  }, [isOnline, outcome, sending, room.isMyTurn, roomVersion, mustPass, sendMove])

  const rename = useCallback((slot: Player, name: string) => {
    setPlayers((current) => ({ ...current, [slot]: { name } }))
  }, [])

  const modeLocked = isOnline && room.connection !== Connection.idle

  const changeGameMode = useCallback(
    (next: GameMode) => {
      if (modeLocked && next !== gameMode) return
      setGameMode(next)
      setPlayers((current) => retitle(current, computerColour(next, starter)))
      if (next === GameMode.online) newGame(openingColour(), boardSize)
    },
    [gameMode, modeLocked, newGame, starter, boardSize]
  )

  const changeStarter = useCallback(
    (next: Starter) => {
      setStarter(next)
      setPlayers((current) => retitle(current, computerColour(gameMode, next)))
    },
    [gameMode]
  )

  const changeBoardSize = useCallback(
    (next: BoardSize) => {
      if (modeLocked || next === boardSize) return
      setBoardSize(next)
      setPending(null)
      // A resize is a different game, not a move — so it clears the past rather than leaving an
      // undo that would step back onto a board of the old size while the pill reads the new one.
      resetGame(openingColour(), next)
    },
    [modeLocked, boardSize, resetGame]
  )

  const handleNewGame = useCallback(() => {
    setPending(null)
    newGame(openingColour(), boardSize)
  }, [newGame, boardSize])

  const displayNames = useMemo(
    () =>
      PLAYER_SLOTS.reduce(
        (all, slot) => ({ ...all, [slot]: displayName(players[slot], slot) }),
        {} as Record<Player, string>
      ),
    [players]
  )

  /* What goes to the room: your name, and a colour field the room requires but Othello ignores. */
  const myProfile = useMemo(() => ({ name: myName.trim(), colour: '0' }), [myName])

  /** The colour you play online: the opener (firstSeat) is dark, the other seat light. */
  const mySlot = room.mySeat === null ? Player.dark : colourForSeat(room.mySeat, room.firstSeat)
  const mySeatEntry = room.seats.find((seat) => seat.seat === room.mySeat)
  const storedName = mySeatEntry?.name.trim() ?? ''

  /* Your name in a room starts as your disc colour — "Dark" or "Light" — and stays editable. Only a
     name you actually typed is kept: yours locally, or one the server still has for your seat after a
     reload. Otherwise the field follows your colour, so the two seats never both read as the same
     default, and neither shows up nameless. */
  useEffect(() => {
    if (!isOnline || room.mySeat === null) return
    setMyName((current) => {
      if (current !== '' && !isColourName(current)) return current
      if (storedName !== '' && !isColourName(storedName)) return storedName
      return DEFAULT_PLAYERS[mySlot].name
    })
  }, [isOnline, room.mySeat, mySlot, storedName])

  const { publishProfile } = room
  const connected = room.connection === Connection.connected
  useEffect(() => {
    if (!isOnline || !connected) return
    const settle = window.setTimeout(() => void publishProfile(myProfile), PROFILE_DEBOUNCE_MS)
    return () => window.clearTimeout(settle)
  }, [isOnline, connected, myProfile, publishProfile])

  /* Follow the room's board size: keep the setup pill in step, and rebuild the board when the host
     resizes the room while waiting. Joining or reloading is handled by `onReset` plus the move replay,
     so the first sync after connecting only adopts the size — it must not rebuild, or it would wipe a
     board that was just replayed. A resize leaves the move list empty, so only this catches it. */
  const roomCellCount = room.cellCount
  const adoptedCellCountRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isOnline || !connected) {
      adoptedCellCountRef.current = null
      return
    }
    const size = boardSizeFor(roomCellCount)
    if (size === null) return
    setBoardSize(size)
    const changed =
      adoptedCellCountRef.current !== null && adoptedCellCountRef.current !== roomCellCount
    adoptedCellCountRef.current = roomCellCount
    if (changed) newGame(openingColour(), size)
  }, [isOnline, connected, roomCellCount, newGame])

  /* The two colours' names. Local, they come from the setup fields; online, from the room's seats,
     mapped to colours the same way the server does (the opener is dark), so both screens agree. */
  const boardPlayers = useMemo(() => {
    const named: Record<Player, string> = {
      [Player.dark]: displayNames[Player.dark],
      [Player.light]: displayNames[Player.light],
    }
    if (!isOnline) return named
    for (const seat of room.seats) {
      const slot = colourForSeat(seat.seat, room.firstSeat)
      named[slot] = seat.name.trim() || DEFAULT_PLAYERS[slot].name
    }
    return named
  }, [isOnline, displayNames, room.seats, room.firstSeat])

  const playerName = useCallback((player: Player) => boardPlayers[player], [boardPlayers])

  const started = counts.dark + counts.light > 4

  // An online game can end with nothing to point at: the clock decides one, walking out another.
  const winnerColour =
    room.winnerSeat === null ? null : colourForSeat(room.winnerSeat, room.firstSeat)
  const decidedOffBoard =
    isOnline &&
    winnerColour !== null &&
    (room.outcome === Outcome.timeout || room.outcome === Outcome.forfeit)

  const opponentName = boardPlayers[opponentOf(mySlot)]
  const onlineWaiting =
    isOnline && connected && !room.opponentPresent && room.status !== RoomStatus.finished

  // The game is over, on the board or off it, so the status line becomes a result banner.
  const gameFinished = outcome !== null || decidedOffBoard
  // The disc beside the line: the winner once it is over (null on a tie), else whoever is to move.
  const statusColour = gameFinished ? (outcome?.winner ?? winnerColour) : currentPlayer
  const status = decidedOffBoard
    ? room.outcome === Outcome.timeout
      ? gameCopy.online.wonOnTime(playerName(winnerColour))
      : gameCopy.online.wonByDefault(playerName(winnerColour))
    : outcome !== null
      ? outcome.winner === null
        ? gameCopy.tie
        : gameCopy.wins(playerName(outcome.winner))
      : onlineWaiting
        ? room.opponentLeft
          ? gameCopy.online.opponentLeft(opponentName)
          : gameCopy.online.waiting
        : skipped !== null
          ? gameCopy.passed(playerName(skipped))
          : isThinking
            ? gameCopy.thinking(playerName(currentPlayer))
            : gameCopy.turn(playerName(currentPlayer))

  return (
    <PageLayout>
      <PageHeader title={gameCopy.title}>
        {isFunMode ? gameCopy.taglineFun : gameCopy.tagline}
      </PageHeader>

      <div className={styles.status} data-win={gameFinished || undefined} aria-live="polite">
        {statusColour !== null && (
          <span className={styles.swatch} data-player={statusColour} aria-hidden="true" />
        )}
        <span className={styles.statusText}>{status}</span>
      </div>

      <div className={styles.play}>
        <div className={styles.boardArea}>
          <ScoreBar
            dark={counts.dark}
            light={counts.light}
            darkName={playerName(Player.dark)}
            lightName={playerName(Player.light)}
            currentPlayer={currentPlayer}
          />
          <Board
            board={board}
            legalCells={interactive ? legalCells : []}
            currentPlayer={currentPlayer}
            lastMove={lastMove}
            flipped={flipped}
            pendingMove={confirming ? pending : null}
            interactive={interactive}
            flipSpeed={flipSpeed}
            // The winning colour lights up its discs: from the board when it filled, or from the room
            // when the clock or a walkout decided it, where there is no board-full outcome to read.
            winner={outcome?.winner ?? winnerColour}
            onPlay={handlePlay}
            playerName={playerName}
          />

          {/* On a phone the room panel sits well below the board, so the clock comes up here, directly
              under it. On a wide layout the panel is beside the board and keeps its own — see the CSS. */}
          {isOnline && (
            <BoardClock
              turnEndsAt={room.turnEndsAt}
              label={gameCopy.online.timeLeft}
              finished={room.status === RoomStatus.finished}
              className={styles.boardClock}
            />
          )}

          {/* Undo, redo and New game are local-only: online, starting a game is the room owner's call,
              handled by the panel's Start / Play again — a New game button here would reset only this
              screen and desync the two boards. */}
          {!isOnline && (
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.button}
                onClick={undo}
                disabled={!canUndo}
                title={gameCopy.undoTitle(computer !== null)}
              >
                {gameCopy.undo}
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={redo}
                disabled={!canRedo}
                title={gameCopy.redoTitle(computer !== null)}
              >
                {gameCopy.redo}
              </button>
              <button type="button" className={styles.button} onClick={handleNewGame}>
                {gameCopy.newGame}
              </button>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <GameSetup
            mode={gameMode}
            difficulty={difficulty}
            starter={starter}
            boardSize={boardSize}
            started={started}
            modeLocked={modeLocked}
            modeLockedReason={gameCopy.online.modeLocked}
            commit={commit}
            onCommitChange={chooseCommit}
            flipSpeed={flipSpeed}
            onFlipSpeedChange={chooseFlipSpeed}
            onModeChange={changeGameMode}
            onDifficultyChange={setDifficulty}
            onStarterChange={changeStarter}
            onBoardSizeChange={changeBoardSize}
          />

          {!isOnline && (
            <section className={styles.players} aria-labelledby="players-heading">
              <h2 id="players-heading" className={styles.playersHeading}>
                {gameCopy.playersTitle}
              </h2>
              {PLAYER_SLOTS.map((slot, index) => (
                <label key={slot} className={styles.nameRow}>
                  <span className={styles.swatch} data-player={slot} aria-hidden="true" />
                  <span className={styles.visuallyHidden}>{gameCopy.nameLabel(index + 1)}</span>
                  <input
                    className={styles.nameInput}
                    value={players[slot].name}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(event) => rename(slot, event.target.value)}
                    aria-label={gameCopy.nameLabel(index + 1)}
                  />
                </label>
              ))}
            </section>
          )}

          {isOnline && (
            <section className={styles.players} aria-labelledby="online-name-heading">
              <h2 id="online-name-heading" className={styles.playersHeading}>
                {gameCopy.playersTitle}
              </h2>
              <label className={styles.nameRow}>
                {/* The disc you play, so you can see which colour your name belongs to. */}
                <span className={styles.swatch} data-player={mySlot} aria-hidden="true" />
                <span className={styles.visuallyHidden}>{gameCopy.online.yourNameLabel}</span>
                <input
                  className={styles.nameInput}
                  value={myName}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={gameCopy.online.yourNameLabel}
                  onChange={(event) => setMyName(event.target.value)}
                  aria-label={gameCopy.online.yourNameLabel}
                />
              </label>
            </section>
          )}

          {isOnline && (
            <OnlinePanel
              room={room}
              profile={myProfile}
              initialCode={inviteCode ?? undefined}
              copy={gameCopy.online}
              maxNameLength={MAX_NAME_LENGTH}
              seatSwatchRgb={seatSwatchRgb}
              hideClockOnMobile
              boardSizes={BOARD_SIZE_OPTIONS}
            />
          )}
        </div>
      </div>
    </PageLayout>
  )
}
