import { useEffect, useRef, useState } from 'react'
import { Board as BoardModel, FlipSpeed, Player } from '../../othello.types'
import { coordOf } from '../../engine/board'
import { cssVars } from '../../../../utils/css-vars'
import { gameCopy } from '../../data'
import styles from './Board.module.scss'

/**
 * How the cascade is timed at each speed: how long one disc takes to turn, and the extra delay per
 * ring of distance from the placed disc so the flip travels outward as a wave. Fast is the snappy
 * default; slow lets you watch the whole line go over.
 */
const FLIP_TIMING: Record<FlipSpeed, { durationMs: number; stepMs: number }> = {
  [FlipSpeed.fast]: { durationMs: 360, stepMs: 70 },
  [FlipSpeed.slow]: { durationMs: 720, stepMs: 150 },
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

type FlipMeta = {
  /** rotate3d axis in the board plane, perpendicular to the capture direction. */
  ax: number
  ay: number
  /** Milliseconds before this disc starts turning, so nearer discs flip first. */
  delay: number
}

type DiscProps = {
  player: Player
  /** How this disc flips when its colour changes. Absent for the four opening discs. */
  flip?: FlipMeta
  /** How long the turn takes, from the flip-speed setting. */
  durationMs: number
}

/**
 * A single disc, dark on one face and light on the other.
 *
 * When its colour changes it turns over in 3D around the axis of the capture that took it, then
 * "bakes": the new colour is written to the front face and the transform is reset to identity, so the
 * next capture — which may come from another direction entirely — starts from a clean slate. The board
 * is tilted for perspective, so each disc carries its own `perspective` and cannot borrow the board's,
 * which would let both faces show through at once.
 */
function Disc({ player, flip, durationMs }: DiscProps) {
  const [shown, setShown] = useState(player)
  const [flipping, setFlipping] = useState(false)
  const previous = useRef(player)
  const bakeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (player === previous.current) return
    previous.current = player

    if (prefersReducedMotion() || !flip) {
      setShown(player)
      return
    }

    setFlipping(true)
    // Fallback bake, in case transitionend never lands (a disc scrolled out of view mid-flip).
    window.clearTimeout(bakeTimer.current)
    bakeTimer.current = setTimeout(
      () => {
        setShown(player)
        setFlipping(false)
      },
      flip.delay + durationMs + 80
    )
  }, [player, flip, durationMs])

  useEffect(() => () => window.clearTimeout(bakeTimer.current), [])

  const bake = () => {
    window.clearTimeout(bakeTimer.current)
    setShown(player)
    setFlipping(false)
  }

  // The back face carries the colour this disc is turning towards, revealed as it passes vertical.
  const back = shown === Player.dark ? Player.light : Player.dark

  return (
    <span
      className={styles.disc}
      data-flipping={flipping || undefined}
      style={cssVars({
        '--ax': flip?.ax ?? 0,
        '--ay': flip?.ay ?? 1,
        '--flip-delay': `${flip?.delay ?? 0}ms`,
        '--flip-duration': `${durationMs}ms`,
      })}
      onTransitionEnd={(event) => {
        if (event.propertyName === 'transform') bake()
      }}
    >
      <span className={styles.face} data-player={shown} data-side="front" />
      {/* The reverse exists only for the duration of a turn. A resting disc has nothing to show on its
          far side, and two circles held at one depth is what let a line of the wrong colour strike
          through it — see the note on `.face` in the stylesheet. */}
      {flipping && <span className={styles.face} data-player={back} data-side="back" />}
    </span>
  )
}

type BoardProps = {
  board: BoardModel
  legalCells: readonly number[]
  currentPlayer: Player
  lastMove: number | null
  flipped: readonly number[]
  /** In confirm-first play, the cell a first tap has aimed but not yet committed. */
  pendingMove?: number | null
  /** Whether the local player may play right now (their turn, game live, not mid-think). */
  interactive: boolean
  /** How fast captured discs turn over. */
  flipSpeed: FlipSpeed
  /** Once the game is over, the winning colour, so its discs can be lit up. Null for a tie or mid-game. */
  winner?: Player | null
  onPlay: (cell: number) => void
  playerName: (player: Player) => string
}

const sign = (value: number) => (value > 0 ? 1 : value < 0 ? -1 : 0)

/** The flip axis and stagger for every disc the last move turned over, keyed by cell index. */
function flipChoreography(
  flipped: readonly number[],
  lastMove: number | null,
  size: number,
  stepMs: number
): Map<number, FlipMeta> {
  const meta = new Map<number, FlipMeta>()
  if (lastMove === null) return meta
  const from = coordOf(lastMove, size)
  for (const cell of flipped) {
    const to = coordOf(cell, size)
    const dr = to.row - from.row
    const dc = to.col - from.col
    // Axis perpendicular to the capture direction, in the board plane.
    const ax = -sign(dr)
    const ay = sign(dc)
    const ring = Math.max(Math.abs(dr), Math.abs(dc))
    meta.set(cell, { ax, ay, delay: (ring - 1) * stepMs })
  }
  return meta
}

/** The playing surface: a tilted grid of cells, each holding a disc or a hint of a legal move. */
export function Board({
  board,
  legalCells,
  currentPlayer,
  lastMove,
  flipped,
  pendingMove = null,
  interactive,
  flipSpeed,
  winner = null,
  onPlay,
  playerName,
}: BoardProps) {
  const { cells, size } = board
  const legal = new Set(legalCells)
  const { durationMs, stepMs } = FLIP_TIMING[flipSpeed]
  const choreography = flipChoreography(flipped, lastMove, size, stepMs)

  return (
    <div className={styles.stage}>
      <div
        className={styles.board}
        role="group"
        aria-label={gameCopy.boardLabel(size)}
        style={cssVars({ '--size': size })}
      >
        {cells.map((cell, index) => {
          const { row, col } = coordOf(index, size)
          const isLegal = legal.has(index)
          const canPlay = interactive && isLegal
          const isPending = pendingMove === index
          const label =
            cell !== null
              ? gameCopy.cellTakenLabel(row + 1, col + 1, playerName(cell))
              : isPending
                ? gameCopy.cellPendingLabel(row + 1, col + 1)
                : isLegal
                  ? gameCopy.cellLegalLabel(row + 1, col + 1, playerName(currentPlayer))
                  : gameCopy.cellLabel(row + 1, col + 1)

          return (
            <button
              key={index}
              type="button"
              className={styles.cell}
              data-legal={isLegal || undefined}
              data-occupied={cell !== null || undefined}
              data-last={lastMove === index || undefined}
              data-won={(winner !== null && cell === winner) || undefined}
              aria-label={label}
              /* Only a legal cell is ever a move target, so the rest stay out of the tab order. The
                 turn lock (thinking, the opponent's turn, a move in flight) is transient and goes in
                 `aria-disabled`: disabling the button the keyboard holds would blur it every turn. */
              disabled={!isLegal}
              aria-disabled={(isLegal && !interactive) || undefined}
              onClick={() => {
                if (!canPlay) return
                onPlay(index)
              }}
            >
              {cell !== null && (
                <Disc player={cell} flip={choreography.get(index)} durationMs={durationMs} />
              )}
              {isPending && cell === null && (
                <span className={styles.disc} data-ghost>
                  {/* One face: an aimed disc is never turned over, so it has no reverse to carry. */}
                  <span className={styles.face} data-player={currentPlayer} data-side="front" />
                </span>
              )}
              {/* The ring carries the colour to move, so the board itself answers "whose turn is it,
                  and which one am I?" without a trip to the score line or the last disc played. */}
              {isLegal && cell === null && !isPending && (
                <span className={styles.hint} data-player={currentPlayer} aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
