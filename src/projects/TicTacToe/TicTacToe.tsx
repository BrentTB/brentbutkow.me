import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { useElementSize } from '../../components/utils/useElementSize'
import { useMediaQuery } from '../../components/utils/useMediaQuery'
import { useViewportHeight } from '../../components/utils/useViewportHeight'
import { useScrollToOnChange } from '../../components/utils/useScrollToOnChange'
import { useRovingRadio } from '../../components/utils/useRovingRadio'
import { Difficulty, GameMode, Player, PlayerProfile, Starter, ViewMode } from './tic-tac-toe.types'
import { cssVars } from './css-vars'
import { DEFAULT_PLAYERS, PLAYER_SLOTS, VIEW_LABELS, gameCopy } from './data'
import { Rng, seededRng } from './engine/rng'
import { useComputerTurn } from './useComputerTurn'
import { GameSetup } from './components/GameSetup/GameSetup'
import { deckHeight, spacingFor } from './engine/geometry'
import { lineShape } from './engine/lines'
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

/** Share of the window each view may take, and a ceiling so it stops growing on a big monitor. */
const DECK_LIMITS: Record<ViewMode, { share: number; max: number }> = {
  [ViewMode.orbit]: { share: 0.5, max: 600 },
  [ViewMode.fanned]: { share: 0.8, max: 940 },
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

export function TicTacToe() {
  const { isFunMode } = useFunMode()
  const isTouch = useMediaQuery(TOUCH_QUERY)
  const viewportHeight = useViewportHeight()

  const [mode, setMode] = useState<ViewMode>(ViewMode.orbit)
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.twoPlayer)
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.medium)
  const [starter, setStarter] = useState<Starter>(Starter.you)
  const [pickedLayer, setPickedLayer] = useState<number | null>(null)
  const [players, setPlayers] = useState<Record<Player, PlayerProfile>>(DEFAULT_PLAYERS)

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

  const statusRef = useRef<HTMLDivElement>(null)
  /* One generator for the whole session, so the computer does not replay the same game every time. Seeded
     lazily: passing the seed straight to `useRef` would draw a fresh one on every render and discard it. */
  const computerRng = useRef<Rng>()
  if (!computerRng.current) computerRng.current = seededRng(Math.floor(Math.random() * 2 ** 31))
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
  const locked = isThinking || (computer !== null && currentPlayer === computer)

  const handlePlay = useCallback(
    (index: number, fromKeyboard: boolean) => {
      // A release that turned the board is a camera move, not a move on the board.
      if (consumedDrag(fromKeyboard)) return
      if (locked) return
      playAt(index)
    },
    [consumedDrag, locked, playAt]
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

  const changeGameMode = useCallback(
    (next: GameMode) => {
      setGameMode(next)
      setPlayers((current) => retitle(current, computerSeat(next, starter)))
    },
    [starter]
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

  const viewKeys = useRovingRadio(VIEW_MODES, mode, setMode)

  /* Whether there is a game to disturb. Changing who starts hands the seats over, so once pieces are down
     the control says what it will do rather than doing it silently. */
  const started = board.some((cell) => cell !== null)

  const shown = namedPlayers[win ? win.player : currentPlayer]
  const shownName = shown.name
  const status = win
    ? gameCopy.wins(shownName)
    : isDraw
      ? gameCopy.draw
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
            players={namedPlayers}
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

          <p className={styles.hint}>{hint}</p>
        </div>

        <aside className={styles.sidebar}>
          <GameSetup
            mode={gameMode}
            started={started}
            difficulty={difficulty}
            starter={starter}
            onModeChange={changeGameMode}
            onDifficultyChange={setDifficulty}
            onStarterChange={changeStarter}
          />
          <PlayerSetup
            players={players}
            displayNames={displayNames}
            computer={computer}
            onRename={rename}
            onRecolour={recolour}
          />
        </aside>
      </div>
    </PageLayout>
  )
}
