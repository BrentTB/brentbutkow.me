import { PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { useFunMode } from '../../contexts/useFunMode'
import { useElementSize } from '../../components/utils/useElementSize'
import { useMediaQuery } from '../../components/utils/useMediaQuery'
import { Player, PlayerProfile, ViewMode } from './tic-tac-toe.types'
import { cssVars } from './css-vars'
import { DEFAULT_PLAYERS, VIEW_LABELS, gameCopy } from './data'
import { spacingFor } from './engine/geometry'
import { describeLine } from './engine/lines'
import { useCamera } from './useCamera'
import { useGame } from './useGame'
import { useWinCamera } from './useWinCamera'
import { Board } from './components/Board/Board'
import { LayerRail } from './components/LayerRail/LayerRail'
import { PlayerSetup } from './components/PlayerSetup/PlayerSetup'
import styles from './TicTacToe.module.scss'

/** Below this there is no hover, so the zoom hint has to name the gesture that exists. */
const TOUCH_QUERY = '(hover: none)'

/** Gap between the layer rail and the board it labels. */
const RAIL_GUTTER = 14

const VIEW_MODES: readonly ViewMode[] = [ViewMode.orbit, ViewMode.fanned]

/** An emptied name field falls back to its default rather than leaving the turn line blank. */
function displayName(profile: PlayerProfile, slot: Player): string {
  return profile.name.trim() || DEFAULT_PLAYERS[slot].name
}

export function TicTacToe() {
  const { isFunMode } = useFunMode()
  const isTouch = useMediaQuery(TOUCH_QUERY)

  const [mode, setMode] = useState<ViewMode>(ViewMode.orbit)
  const [focusedLayer, setFocusedLayer] = useState<number | null>(null)
  const [players, setPlayers] = useState<Record<Player, PlayerProfile>>(DEFAULT_PLAYERS)

  const { board, currentPlayer, win, isDraw, playAt, newGame, undo, redo, canUndo, canRedo } =
    useGame()
  const camera = useCamera(mode)

  const stageRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const stage = useElementSize(stageRef)
  const rail = useElementSize(railRef)

  // The rail's buttons take pointer events, so the board must not sit underneath them.
  const reserved = rail.width + RAIL_GUTTER
  const spacing = spacingFor(mode, Math.max(0, stage.width - reserved), stage.height)

  useWinCamera(win, camera.faceLine)

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

  const handlePlay = useCallback(
    (index: number, fromKeyboard: boolean) => {
      // A release that turned the board is a camera move, not a move on the board.
      if (consumedDrag(fromKeyboard)) return
      playAt(index)
    },
    [consumedDrag, playAt]
  )

  // Focus isolates a layer without touching the camera: the viewpoint stays where it was put.
  const handleFocusLayer = useCallback(
    (layer: number) => setFocusedLayer((current) => (current === layer ? null : layer)),
    []
  )

  const handleNewGame = useCallback(() => {
    newGame()
    setFocusedLayer(null)
  }, [newGame])

  const rename = useCallback((slot: Player, name: string) => {
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], name } }))
  }, [])

  const recolour = useCallback((slot: Player, rgb: string) => {
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], rgb } }))
  }, [])

  const shown = win ? players[win.player] : players[currentPlayer]
  const shownSlot = win ? win.player : currentPlayer
  const status = win
    ? gameCopy.wins(displayName(shown, shownSlot))
    : isDraw
      ? gameCopy.draw
      : gameCopy.turn(displayName(shown, shownSlot))

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

      <div className={styles.status} style={cssVars({ '--bead-rgb': shown.rgb })}>
        <span className={styles.swatch} aria-hidden="true" />
        <span className={styles.statusText} aria-live="polite">
          {status}
        </span>
        {win && <span className={styles.shape}>{describeLine(win.cells)}</span>}
      </div>

      <div className={styles.play}>
        <div className={styles.boardArea} data-mode={mode}>
          <Board
            board={board}
            win={win}
            focusedLayer={focusedLayer}
            players={players}
            mode={mode}
            camera={camera.camera}
            spacing={spacing}
            shift={reserved / 2}
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
              stageHeight={stage.height}
              railRef={railRef}
              isDragging={camera.isDragging}
              onFocusLayer={handleFocusLayer}
            />
          </Board>
        </div>

        <div className={styles.controls}>
          <div className={styles.group}>
            <span className={styles.groupLabel}>{gameCopy.viewLabel}</span>
            <div className={styles.segmented}>
              {VIEW_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
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
              onClick={undo}
              disabled={!canUndo}
              title={gameCopy.undoTitle}
            >
              {gameCopy.undo}
            </button>
            <button type="button" className={styles.button} onClick={redo} disabled={!canRedo}>
              {gameCopy.redo}
            </button>
            {camera.orbitable && (
              <button type="button" className={styles.button} onClick={camera.snap}>
                {gameCopy.straighten}
              </button>
            )}
            <button type="button" className={styles.button} onClick={handleNewGame}>
              {gameCopy.newGame}
            </button>
          </div>

          <p className={styles.hint}>{hint}</p>
        </div>

        <aside className={styles.sidebar}>
          <PlayerSetup players={players} onRename={rename} onRecolour={recolour} />
        </aside>
      </div>
    </PageLayout>
  )
}
