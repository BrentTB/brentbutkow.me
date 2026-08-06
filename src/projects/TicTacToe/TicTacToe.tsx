import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { useElementSize } from '../../components/utils/useElementSize'
import { useMediaQuery } from '../../components/utils/useMediaQuery'
import { useViewportHeight } from '../../components/utils/useViewportHeight'
import { useScrollToOnChange } from '../../components/utils/useScrollToOnChange'
import { useRovingRadio } from '../../components/utils/useRovingRadio'
import {
  Difficulty,
  GameMode,
  MoveCommit,
  Player,
  PlayerProfile,
  Starter,
  ViewMode,
} from './tic-tac-toe.types'
import { cssVars } from './css-vars'
import {
  DEFAULT_PLAYERS,
  MAX_NAME_LENGTH,
  PLAYER_COLOURS,
  PLAYER_SLOTS,
  VIEW_LABELS,
  gameCopy,
} from './data'
import { Rng, seededRng } from '../../utils/rng'
import { useComputerTurn } from './useComputerTurn'
import { useMoveCommit } from './useMoveCommit'
import { Connection, useOnlineRoom } from '../../multiplayer/useOnlineRoom'
import { parseRoomInvite } from '../../multiplayer/room-code'
import { loadRoomSession } from '../../multiplayer/room-session'
import { Outcome, RoomStatus } from '../../multiplayer/multiplayer.types'
import {
  TIC_TAC_TOE_CELL_COUNT,
  TIC_TAC_TOE_GAME_ID,
  cellCodec,
  openingPlayer,
  freeColour,
  playerForSeat,
  yieldsColour,
} from './online'
import { GameSetup } from './components/GameSetup/GameSetup'
import { OnlinePanel } from '../../multiplayer/OnlinePanel/OnlinePanel'
import { applyMove, isBoardFull, opponentOf } from './engine/board'
import { deckHeight, spacingFor } from './engine/geometry'
import { findWinningLine, lineShape } from './engine/lines'
import { useCamera } from './useCamera'
import { useGame } from './useGame'
import { useWinCamera } from './useWinCamera'
import { Board } from './components/Board/Board'
import { LayerRail } from './components/LayerRail/LayerRail'
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup'
import { HistoryDirection, HistoryIcon } from './components/HistoryIcon/HistoryIcon'
import { NewGameIcon } from './components/NewGameIcon/NewGameIcon'
import styles from './TicTacToe.module.scss'

/** Below this there is no hover, so the zoom hint has to name the gesture that exists. */
const TOUCH_QUERY = '(hover: none)'

/** Gap between the layer rail and the board it labels. */
const RAIL_GUTTER = 14

/** How long typing settles before your name goes to the room, so a rename is one write and not ten. */
const PROFILE_DEBOUNCE_MS = 400

/** Share of the window each view may take, and a ceiling so it stops growing on a big monitor. */
const DECK_LIMITS: Record<ViewMode, { share: number; max: number }> = {
  [ViewMode.orbit]: { share: 0.88, max: 1120 },
  [ViewMode.fanned]: { share: 0.88, max: 1040 },
}

const VIEW_MODES = Object.values(ViewMode)

/**
 * Which seat the computer holds. Whoever starts takes player one, so choosing "computer" hands it the
 * opening move, which on this board is a real advantage.
 */
function computerSeat(mode: GameMode, starter: Starter): Player | null {
  if (mode !== GameMode.onePlayer) return null
  return starter === Starter.computer ? Player.one : Player.two
}

/** An emptied name field falls back to its default rather than leaving the turn line blank. */
function displayName(profile: PlayerProfile, slot: Player): string {
  return profile.name.trim() || DEFAULT_PLAYERS[slot].name
}

/**
 * Names the computer's seat "Computer" and puts the slot name back when it hands the seat over.
 *
 * Matches on the name rather than the seat, so a name you typed yourself survives a switch between one and
 * two players — unless you typed "Computer" into your own field, which it will hand back to the default.
 */
function retitle(
  players: Record<Player, PlayerProfile>,
  computer: Player | null
): Record<Player, PlayerProfile> {
  const next = { ...players }
  for (const slot of PLAYER_SLOTS) {
    const slotDefault = DEFAULT_PLAYERS[slot].name
    if (slot === computer && next[slot].name === slotDefault) {
      next[slot] = { ...next[slot], name: gameCopy.computerName }
    } else if (slot !== computer && next[slot].name === gameCopy.computerName) {
      next[slot] = { ...next[slot], name: slotDefault }
    }
  }
  return next
}

interface TicTacToeProps {
  /**
   * Seeds the computer's choices. Left out, a fresh seed is drawn per session so it does not replay the
   * same game every time; a test pins it so the game it plays is the same one on every run.
   */
  computerSeed?: number
}

export function TicTacToe({ computerSeed }: TicTacToeProps = {}) {
  const { isFunMode } = useFunMode()
  const isTouch = useMediaQuery(TOUCH_QUERY)
  const viewportHeight = useViewportHeight()

  const [mode, setMode] = useState<ViewMode>(ViewMode.orbit)
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.twoPlayer)
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.medium)
  const [starter, setStarter] = useState<Starter>(Starter.you)
  const [pickedLayer, setPickedLayer] = useState<number | null>(null)
  const [players, setPlayers] = useState<Record<Player, PlayerProfile>>(DEFAULT_PLAYERS)
  /* A move aimed but not sent, when this player has asked to confirm their moves. Local to this screen:
     the room hears nothing about it until it is committed. */
  const [pending, setPending] = useState<number | null>(null)
  const { commit, choose: chooseCommit } = useMoveCommit()

  const computer = computerSeat(gameMode, starter)

  const {
    board,
    currentPlayer,
    win,
    isDraw,
    lastMove,
    playAt,
    newGame,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGame(computer)
  const camera = useCamera(mode)

  const isOnline = gameMode === GameMode.online

  // The generic room, fed the game's id and codec. Confirmed moves (mine, echoed back, and the
  // opponent's) arrive through onRemoteMove and go onto the board like any other move.
  const room = useOnlineRoom<number>({
    gameId: TIC_TAC_TOE_GAME_ID,
    cellCount: TIC_TAC_TOE_CELL_COUNT,
    codec: cellCodec,
    onRemoteMove: (cell) => playAt(cell),
    // The room decides who opens each game, so a cleared board starts with that seat's player.
    onReset: (state) => newGame(openingPlayer(state.firstSeat)),
  })

  /* Whether a room has actually been entered here, which the effects below key off: it separates "not in
     a room yet" from "stepped out of one". */
  const wasInRoomRef = useRef(false)
  if (room.connection === Connection.connected) wasInRoomRef.current = true

  /* The room whose seat has already been settled into, so the effect below runs once per room. */
  const adoptedRef = useRef<string | null>(null)

  /* A code prefilled from an invite link, and the switch into online mode that an invite implies. The
     link carries only the code: this page already says which game it is, and you pick your own colour.

     A seat held in this tab counts too. A reload starts the page in its default mode, and the room only
     shows in online mode, so the seat being resumed has to bring the mode with it. */
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  useEffect(() => {
    const code = parseRoomInvite(new URLSearchParams(window.location.search))
    if (code !== null) setInviteCode(code)
    if (code !== null || loadRoomSession(TIC_TAC_TOE_GAME_ID) !== null) {
      setGameMode(GameMode.online)
    }
  }, [])

  /* Leaving online mode ends the session, so its poll loop can't keep dropping moves onto a local game.
     Gated on having been in a room: the page can start in a local mode while a seat from this tab is
     still being resumed, and leaving then would throw that seat away before it comes back. */
  const leaveRoom = room.leave
  useEffect(() => {
    if (!isOnline && wasInRoomRef.current) leaveRoom()
  }, [isOnline, leaveRoom])

  /* The prefilled code belongs to the room you arrived for, so stepping out of a room empties the join
     field rather than offering the same code back. Gated on having been in one: the connection starts
     idle, and clearing then would wipe the code an invite link had just supplied. */
  const leftRoom = wasInRoomRef.current && room.connection === Connection.idle
  useEffect(() => {
    if (!leftRoom) return
    wasInRoomRef.current = false
    /* Rejoining is a fresh settlement, even of the same room: coming back into the other seat has to make
       you that seat's player rather than leaving both screens showing Player 1. */
    adoptedRef.current = null
    setInviteCode(null)
    /* A name and colour the room handed you belong to that room: the seat default and the colour picked
       around an opponent both go back, so a local game afterwards is Player 1 in Player 1's colour
       rather than a second Player 2. A name you typed yourself is left alone. */
    setPlayers((current) => {
      const mine = current[Player.one]
      const wasGivenName = PLAYER_SLOTS.some((slot) => mine.name === DEFAULT_PLAYERS[slot].name)
      const wasGivenColour = PLAYER_SLOTS.some((slot) => mine.rgb === DEFAULT_PLAYERS[slot].rgb)
      if (!wasGivenName && !wasGivenColour) return current
      return {
        ...current,
        [Player.one]: {
          name: wasGivenName ? DEFAULT_PLAYERS[Player.one].name : mine.name,
          rgb: wasGivenColour ? DEFAULT_PLAYERS[Player.one].rgb : mine.rgb,
        },
      }
    })
  }, [leftRoom])

  const statusRef = useRef<HTMLDivElement>(null)
  /* One generator for the whole session, so the computer does not replay the same game every time. Seeded
     lazily: passing the seed straight to `useRef` would draw a fresh one on every render and discard it. */
  const computerRng = useRef<Rng>()
  if (!computerRng.current) {
    computerRng.current = seededRng(computerSeed ?? Math.floor(Math.random() * 2 ** 31))
  }
  const stageRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const stage = useElementSize(stageRef)
  const rail = useElementSize(railRef)

  /**
   * The rail's buttons take pointer events, so the board must not sit underneath them.
   *
   * Spacing comes from the width left over and a cap taken from the window, never from the board's own
   * measured height: its height is set from the spacing, and reading it back would close a loop.
   */
  const reserved = rail.width + RAIL_GUTTER
  const limits = DECK_LIMITS[mode]
  const spacing = spacingFor(
    mode,
    Math.max(0, stage.width - reserved),
    Math.min(viewportHeight * limits.share, limits.max)
  )
  const boardHeight = deckHeight(mode, spacing)

  /* Singling out a layer only earns its keep in the cube, where layers hide behind each other. The
     fanned deck already shows all four, so blanking three of them there just removes information. */
  const canFocusLayer = mode === ViewMode.orbit
  const focusedLayer = canFocusLayer ? pickedLayer : null

  const { isThinking } = useComputerTurn({
    board,
    computer,
    currentPlayer,
    difficulty,
    finished: win !== null || isDraw,
    rng: computerRng.current,
    play: playAt,
  })

  useWinCamera(win, camera.faceLine)

  /* The two views differ a lot in height, so the scroll position that framed one frames the other
     badly: switching left you below a short cube or above the deck's bottom layer. Anchoring on the
     status rather than the board keeps the line saying whose turn it is on screen. */
  useScrollToOnChange(statusRef, mode)

  const toPointer = (event: PointerEvent<HTMLDivElement>) => ({
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  })

  const { beginPointer, movePointer, endPointer, consumedDrag } = camera

  /**
   * A press that lands on a bead still starts a drag: grabbing the board by one of its own pieces is
   * the natural thing to try. Whether it turns out to be a move is decided on release, by whether the
   * pointer travelled. Only the layer rail opts out, since its buttons act on press.
   *
   * No pointer capture here on purpose: capturing on the stage would retarget the release and the
   * cell's own click would never fire, which also breaks keyboard activation.
   */
  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.target instanceof Element && event.target.closest('[data-rail]')) return
      beginPointer(toPointer(event))
    },
    [beginPointer]
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => movePointer(toPointer(event)),
    [movePointer]
  )

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => endPointer(event.pointerId),
    [endPointer]
  )

  /**
   * A release outside the stage never reaches the stage's own handler, which would leave the drag flag
   * stuck true and silently swallow every later tap.
   */
  useEffect(() => {
    const release = (event: globalThis.PointerEvent) => endPointer(event.pointerId)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [endPointer])

  /**
   * The board is locked while the seat belongs to the computer. Without this a tap during its think
   * pause plays *its* move for it: the bead lands in the computer's colour, the turn comes straight
   * back, and the reply it had already chosen is dropped along with the pending timer.
   */
  /* A move already on its way out also closes the board. Without it a second tap during the round trip
     sent the same turn twice, and the server's rejection of the second reads as "the board moved on". */
  const [sending, setSending] = useState(false)

  const locked = isOnline
    ? !room.isMyTurn || sending
    : isThinking || (computer !== null && currentPlayer === computer)

  /** Sends a move to the room. The server cannot judge the board, so a winning move says so itself. */
  const submitMove = room.submit
  const aimMove = room.aim
  const sendMove = useCallback(
    async (index: number) => {
      const after = applyMove(board, index, currentPlayer)
      const won = findWinningLine(after, currentPlayer) !== null
      setPending(null)
      setSending(true)
      try {
        await submitMove(index, won || isBoardFull(after), won)
      } finally {
        setSending(false)
      }
    },
    [board, currentPlayer, submitMove]
  )

  const confirming = isOnline && commit === MoveCommit.confirm

  /* A pending move belongs to one turn on one board, and everything that ends that turn shows up as the
     board locking: the move landing, the opponent's reply, a game ending or starting. */
  useEffect(() => {
    if (!confirming || locked) setPending(null)
  }, [confirming, locked])

  const handlePlay = useCallback(
    (index: number, fromKeyboard: boolean) => {
      // A release that turned the board is a camera move, not a move on the board.
      if (consumedDrag(fromKeyboard)) return
      if (locked) return
      // Online moves go to the server, which confirms them back through onRemoteMove; local games play
      // straight onto the board.
      if (isOnline) {
        // Confirming: the first press aims, a second press on the same cell sends it. Aiming elsewhere
        // just moves the ghost, so a mis-tap costs nothing.
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
    [consumedDrag, locked, isOnline, confirming, pending, sendMove, playAt, aimMove]
  )

  // Focus isolates a layer without touching the camera: the viewpoint stays where it was put.
  const handleFocusLayer = useCallback(
    (layer: number) => setPickedLayer((current) => (current === layer ? null : layer)),
    []
  )

  const handleNewGame = useCallback(() => {
    newGame()
    setPickedLayer(null)
  }, [newGame])

  const rename = useCallback((slot: Player, name: string) => {
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], name } }))
  }, [])

  /* Held in a room: switching away from online would leave it, which mid-game is a forfeit. The controls
     say so as well, but the guard belongs here too — this is the one place the switch happens. */
  const modeLocked = isOnline && room.connection !== Connection.idle

  const changeGameMode = useCallback(
    (next: GameMode) => {
      if (modeLocked && next !== gameMode) return
      setGameMode(next)
      setPlayers((current) => retitle(current, computerSeat(next, starter)))
      // Entering online starts from a clean board; the room fills it from the server as moves confirm.
      if (next === GameMode.online) {
        newGame()
        setPickedLayer(null)
      }
    },
    [gameMode, modeLocked, newGame, starter]
  )

  const changeStarter = useCallback(
    (next: Starter) => {
      setStarter(next)
      setPlayers((current) => retitle(current, computerSeat(gameMode, next)))
    },
    [gameMode]
  )

  const recolour = useCallback((slot: Player, rgb: string) => {
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], rgb } }))
  }, [])

  /* One place the blank-name fallback happens, so the turn line, the cell labels, and the colour groups
     cannot disagree about what a player is called. */
  const displayNames = useMemo(
    () =>
      PLAYER_SLOTS.reduce(
        (all, slot) => ({ ...all, [slot]: displayName(players[slot], slot) }),
        {} as Record<Player, string>
      ),
    [players]
  )
  const namedPlayers = useMemo(
    () =>
      PLAYER_SLOTS.reduce(
        (all, slot) => ({ ...all, [slot]: { ...players[slot], name: displayNames[slot] } }),
        {} as Record<Player, PlayerProfile>
      ),
    [displayNames, players]
  )

  /* Online you edit one identity, always held in the first local slot, whichever seat the room gives
     you. Tying it to the seat instead would throw away the name you typed before joining, the moment
     joining made you the second player. The board reads its colours from the room, not from here. */
  const myProfile = useMemo(
    () => ({ name: displayNames[Player.one], colour: players[Player.one].rgb }),
    [displayNames, players]
  )

  /* The opponent's colour, so the swatch list can rule it out. Theirs to choose, not yours to reuse. */
  const opponentColour = room.seats.find((seat) => seat.seat !== room.mySeat)?.colour

  /* Both players start on the same default colour, and the board would be unreadable with two identical
     sets of beads, so the second seat moves off it. The replacement also avoids the other local slot's
     colour, so stepping back out of the room does not leave a local game in one colour. */
  useEffect(() => {
    if (!isOnline || !yieldsColour(room.mySeat, players[Player.one].rgb, opponentColour)) return
    const free = freeColour(PLAYER_COLOURS, [opponentColour, players[Player.two].rgb])
    if (free !== undefined) recolour(Player.one, free)
  }, [isOnline, opponentColour, players, recolour, room.mySeat])

  /**
   * Settles who you are the moment you enter a room, in one place.
   *
   * Two rules, in order. A name or colour somebody actually chose comes back with the seat, so resuming
   * after a reload restores what you typed instead of letting a freshly-defaulted page publish over it.
   * Anything still at a default follows the seat number instead, so joining makes you Player 2 in Player
   * 2's colour rather than a second Player 1 in the same amber.
   *
   * Deliberately one effect: as two, the adopt half overwrote the seat-default half in the same commit,
   * and neither re-ran to settle it.
   */
  const mySeatEntry = room.seats.find((seat) => seat.seat === room.mySeat)
  useEffect(() => {
    if (!isOnline || room.code === null || room.mySeat === null) return
    if (mySeatEntry === undefined || adoptedRef.current === room.code) return
    adoptedRef.current = room.code

    const seatDefault = DEFAULT_PLAYERS[PLAYER_SLOTS[room.mySeat]]
    const storedName = mySeatEntry.name.trim()
    const storedColour = mySeatEntry.colour
    const nameIsDefault = PLAYER_SLOTS.some((slot) => storedName === DEFAULT_PLAYERS[slot].name)
    const colourIsDefault = PLAYER_SLOTS.some((slot) => storedColour === DEFAULT_PLAYERS[slot].rgb)

    setPlayers((current) => ({
      ...current,
      [Player.one]: {
        name: storedName && !nameIsDefault ? storedName : seatDefault.name,
        rgb: storedColour && !colourIsDefault ? storedColour : seatDefault.rgb,
      },
    }))
  }, [isOnline, room.code, room.mySeat, mySeatEntry])

  /* Publishes your name and colour to the room whenever you change them, so the opponent's board shows
     the piece in your colour under your name rather than a stale default.

     Debounced, because this fires on every keystroke in the name field and each one is a write the
     opponent only needs the end of. */
  const { publishProfile } = room
  const connected = room.connection === Connection.connected
  useEffect(() => {
    if (!isOnline || !connected) return
    const settle = window.setTimeout(() => void publishProfile(myProfile), PROFILE_DEBOUNCE_MS)
    return () => window.clearTimeout(settle)
  }, [isOnline, connected, myProfile, publishProfile])

  /* Online, both seats' names and colours come from the room, so the two screens agree and the players
     never render alike. Seats the room has not filled yet fall back to the local profiles. */
  const boardPlayers = useMemo(() => {
    if (!isOnline) return namedPlayers
    const next: Record<Player, PlayerProfile> = { ...namedPlayers }
    for (const seat of room.seats) {
      const slot = playerForSeat(seat.seat)
      next[slot] = {
        name: seat.name.trim() || DEFAULT_PLAYERS[slot].name,
        rgb: seat.colour,
      }
    }
    return next
  }, [isOnline, namedPlayers, room.seats])

  const viewKeys = useRovingRadio(VIEW_MODES, mode, setMode)

  /* Whether there is a game to disturb. Changing who starts hands the seats over, so once pieces are down
     the control says what it will do rather than doing it silently. */
  const started = board.some((cell) => cell !== null)

  /* The room decides who opens, and it can be changed while the board is still empty. `onReset` only
     fires when a game actually begins, so an opening move handed to the other seat before the first one
     has to re-open the local game here — otherwise this screen plays the opponent's beads in your colour
     under your name, and credits the win to the wrong player. */
  useEffect(() => {
    if (isOnline && !started) newGame(openingPlayer(room.firstSeat))
  }, [isOnline, started, room.firstSeat, newGame])

  /* An online game can end with nothing on the board to point at: the clock decides one, and walking
     out decides another. Those verdicts come from the room, so the name is looked up by winning seat —
     and with no winning seat there is nothing to say, since the player on turn is the one who just lost. */
  const winnerName =
    room.winnerSeat === null ? null : boardPlayers[playerForSeat(room.winnerSeat)].name
  const decidedOffBoard =
    isOnline &&
    winnerName !== null &&
    (room.outcome === Outcome.timeout || room.outcome === Outcome.forfeit)

  const shown = boardPlayers[win ? win.player : currentPlayer]
  const shownName = shown.name
  const mySlot = room.mySeat === null ? Player.one : playerForSeat(room.mySeat)
  const opponentName = boardPlayers[opponentOf(mySlot)].name
  const onlineWaiting =
    isOnline &&
    room.connection === Connection.connected &&
    !room.opponentPresent &&
    room.status !== RoomStatus.finished
  const status = decidedOffBoard
    ? room.outcome === Outcome.timeout
      ? gameCopy.online.wonOnTime(winnerName)
      : gameCopy.online.wonByDefault(winnerName)
    : win
      ? gameCopy.wins(shownName)
      : isDraw
        ? gameCopy.draw
        : onlineWaiting
          ? // An empty seat somebody walked out of is not a seat still waiting for its first player.
            room.opponentLeft
            ? gameCopy.online.opponentLeft(opponentName)
            : gameCopy.online.waiting
          : isThinking
            ? gameCopy.thinking(shownName)
            : gameCopy.turn(shownName)

  const hint = camera.orbitable
    ? isTouch
      ? gameCopy.orbitHintTouch
      : gameCopy.orbitHint
    : gameCopy.fannedHint

  return (
    <PageLayout>
      <PageHeader title={gameCopy.title}>
        {isFunMode ? gameCopy.taglineFun : gameCopy.tagline}
      </PageHeader>

      {/* One live region over the whole line, so the shape of a win is announced with it rather than
          silently appearing next to it. */}
      <div
        className={styles.status}
        ref={statusRef}
        style={cssVars({ '--bead-rgb': shown.rgb })}
        aria-live="polite"
      >
        <span className={styles.swatch} aria-hidden="true" />
        <span className={styles.statusText}>{status}</span>
        {win && <span className={styles.shape}>{gameCopy.lineShape(lineShape(win.cells))}</span>}
      </div>

      <div className={styles.play}>
        <div className={styles.boardArea} style={{ height: `${boardHeight}px` }}>
          <Board
            board={board}
            win={win}
            locked={locked}
            focusedLayer={focusedLayer}
            lastMove={lastMove}
            pendingCell={pending}
            players={boardPlayers}
            mode={mode}
            camera={camera.camera}
            spacing={spacing}
            shift={reserved / 2}
            turnRgb={shown.rgb}
            isDragging={camera.isDragging}
            stageRef={stageRef}
            onPlay={handlePlay}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerEnd={handlePointerEnd}
          >
            <LayerRail
              focusedLayer={focusedLayer}
              mode={mode}
              camera={camera.camera}
              spacing={spacing}
              stageHeight={boardHeight}
              railRef={railRef}
              selectable={canFocusLayer}
              onFocusLayer={handleFocusLayer}
            />
          </Board>
        </div>

        <div className={styles.controls}>
          <div className={styles.group}>
            <span className={styles.groupLabel} id="view-label">
              {gameCopy.viewLabel}
            </span>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-label={gameCopy.viewLabel}
              aria-labelledby="view-label"
            >
              {VIEW_MODES.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={mode === option}
                  onClick={() => setMode(option)}
                  {...viewKeys(index)}
                >
                  {VIEW_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {/* No take-backs online: a committed move belongs to both players, so undo, redo, and a
              unilateral new game all step out. Leaving the room is how you start over. */}
          {!isOnline && (
            <div className={styles.group}>
              <button
                type="button"
                className={styles.button}
                onClick={() => undo()}
                disabled={!canUndo}
                title={gameCopy.undoTitle(computer !== null)}
                aria-label={gameCopy.undo}
              >
                <HistoryIcon direction={HistoryDirection.back} />
                <span className={styles.buttonWord}>{gameCopy.undo}</span>
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => redo()}
                disabled={!canRedo}
                title={gameCopy.redoTitle(computer !== null)}
                aria-label={gameCopy.redo}
              >
                <HistoryIcon direction={HistoryDirection.forward} />
                <span className={styles.buttonWord}>{gameCopy.redo}</span>
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={handleNewGame}
                aria-label={gameCopy.newGame}
              >
                <NewGameIcon />
                <span className={styles.buttonWord}>{gameCopy.newGame}</span>
              </button>
            </div>
          )}

          {/* The other half of confirming: a button for anyone who would rather press one than tap the
              same cell twice, and the clock's warning where a room is running one. Both wait for a room:
              with no game to aim a move at, the pair could only ever render greyed out. */}
          {confirming && connected && (
            <div className={styles.group}>
              <button
                type="button"
                className={styles.button}
                onClick={() => pending !== null && void sendMove(pending)}
                disabled={pending === null || locked}
              >
                <span className={styles.buttonWord}>{gameCopy.online.confirmMove}</span>
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => setPending(null)}
                disabled={pending === null}
              >
                <span className={styles.buttonWord}>{gameCopy.online.clearMove}</span>
              </button>
            </div>
          )}

          <p className={styles.hint}>{hint}</p>
        </div>

        <aside className={styles.sidebar}>
          <GameSetup
            mode={gameMode}
            started={started}
            modeLocked={modeLocked}
            modeLockedReason={gameCopy.online.modeLocked}
            difficulty={difficulty}
            starter={starter}
            commit={commit}
            onCommitChange={chooseCommit}
            onModeChange={changeGameMode}
            onDifficultyChange={setDifficulty}
            onStarterChange={changeStarter}
          />
          {isOnline && (
            <OnlinePanel
              room={room}
              profile={myProfile}
              initialCode={inviteCode ?? undefined}
              copy={gameCopy.online}
              maxNameLength={MAX_NAME_LENGTH}
              seatSwatchRgb={(entry) => entry.colour}
            />
          )}
          <PlayerSetup
            players={players}
            displayNames={displayNames}
            computer={computer}
            ownSlot={isOnline ? Player.one : null}
            ownLabel={isOnline ? gameCopy.online.yourNameLabel : undefined}
            reservedColour={isOnline ? opponentColour : undefined}
            onRename={rename}
            onRecolour={recolour}
          />
        </aside>
      </div>
    </PageLayout>
  )
}
