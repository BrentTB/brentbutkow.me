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
import { DEFAULT_PLAYERS, PLAYER_SLOTS, gameCopy } from './data'
import { Rng, seededRng } from './engine/rng'
import { opponentOf } from './engine/board'
import { useGame } from './useGame'
import { useComputerTurn } from './useComputerTurn'
import { useMoveCommit } from './useMoveCommit'
import {
  OTHELLO_GAME_ID,
  PASS_MOVE,
  cellCodec,
  colourForSeat,
  openingColour,
  othelloCellCount,
} from './online'
import { Board } from './components/Board/Board'
import { GameSetup } from './components/GameSetup/GameSetup'
import { OnlinePanel } from './components/OnlinePanel/OnlinePanel'
import { ScoreBar } from './components/ScoreBar/ScoreBar'
import styles from './Othello.module.scss'

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
  const [pending, setPending] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const { commit, choose: chooseCommit } = useMoveCommit()

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
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGame(boardSize, computer, Player.dark)

  const isOnline = gameMode === GameMode.online

  const room = useOnlineRoom<number>({
    gameId: OTHELLO_GAME_ID,
    cellCount: othelloCellCount(boardSize),
    codec: cellCodec,
    // A confirmed move — mine echoed back, or the opponent's — lands on the board like any other. A
    // pass (-1) advances the turn without a disc.
    onRemoteMove: (move) => (move === PASS_MOVE ? pass() : playAt(move)),
    // The room opens each game with dark, on a fresh board of the room's size.
    onReset: () => newGame(openingColour(), boardSize),
  })

  const wasInRoomRef = useRef(false)
  if (room.connection === Connection.connected) wasInRoomRef.current = true
  const adoptedRef = useRef<string | null>(null)

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
    adoptedRef.current = null
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
          else setPending(index)
          return
        }
        void sendMove(index)
        return
      }
      playAt(index)
    },
    [locked, isOnline, confirming, pending, sendMove, playAt]
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
     same turn. Only ever sent on your own turn, and once — the send flips `sending` until it lands. */
  useEffect(() => {
    if (!isOnline || outcome !== null || sending) return
    if (!room.isMyTurn || !mustPass) return
    void sendMove(PASS_MOVE)
  }, [isOnline, outcome, sending, room.isMyTurn, mustPass, sendMove])

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
      newGame(openingColour(), next)
    },
    [modeLocked, boardSize, newGame]
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

  const myProfile = useMemo(
    () => ({ name: displayNames[Player.dark], colour: '0' }),
    [displayNames]
  )

  /* Settle who you are on entering a room: a name you typed comes back with the seat on a reload, and a
     seat still on its default follows the seat instead, so the two screens never render alike. */
  const mySeatEntry = room.seats.find((seat) => seat.seat === room.mySeat)
  useEffect(() => {
    if (!isOnline || room.code === null || room.mySeat === null || mySeatEntry === undefined) return
    if (adoptedRef.current === room.code) return
    adoptedRef.current = room.code
    const stored = mySeatEntry.name.trim()
    const isDefault = PLAYER_SLOTS.some((slot) => stored === DEFAULT_PLAYERS[slot].name)
    setPlayers((current) => ({
      ...current,
      [Player.dark]: { name: stored && !isDefault ? stored : DEFAULT_PLAYERS[Player.dark].name },
    }))
  }, [isOnline, room.code, room.mySeat, mySeatEntry])

  const { publishProfile } = room
  const connected = room.connection === Connection.connected
  useEffect(() => {
    if (!isOnline || !connected) return
    const settle = window.setTimeout(() => void publishProfile(myProfile), PROFILE_DEBOUNCE_MS)
    return () => window.clearTimeout(settle)
  }, [isOnline, connected, myProfile, publishProfile])

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

  const mySlot = room.mySeat === null ? Player.dark : colourForSeat(room.mySeat, room.firstSeat)
  const opponentName = boardPlayers[opponentOf(mySlot)]
  const onlineWaiting =
    isOnline && connected && !room.opponentPresent && room.status !== RoomStatus.finished

  const statusColour = outcome?.winner ?? currentPlayer
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

      <div className={styles.status} aria-live="polite">
        <span className={styles.swatch} data-player={statusColour} aria-hidden="true" />
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
            onPlay={handlePlay}
            playerName={playerName}
          />

          <div className={styles.controls}>
            {!isOnline && (
              <>
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
              </>
            )}
            <button type="button" className={styles.button} onClick={handleNewGame}>
              {gameCopy.newGame}
            </button>
          </div>
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
                    maxLength={14}
                    onChange={(event) => rename(slot, event.target.value)}
                    aria-label={gameCopy.nameLabel(index + 1)}
                  />
                </label>
              ))}
            </section>
          )}

          {isOnline && (
            <OnlinePanel room={room} profile={myProfile} initialCode={inviteCode ?? undefined} />
          )}
        </div>
      </div>
    </PageLayout>
  )
}
