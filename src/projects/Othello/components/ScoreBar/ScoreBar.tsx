import { Player } from '../../othello.types'
import { cssVars } from '../../css-vars'
import { gameCopy } from '../../data'
import styles from './ScoreBar.module.scss'

interface ScoreBarProps {
  dark: number
  light: number
  darkName: string
  lightName: string
  /** Whose turn it is, so the leading colour's tally can be marked without stating a winner mid-game. */
  currentPlayer: Player
}

/** A live tally of the two colours, and a bar that fills in proportion so the lead reads at a glance. */
export function ScoreBar({ dark, light, darkName, lightName, currentPlayer }: ScoreBarProps) {
  const total = dark + light
  // An empty board would divide by zero; the opening position never is, but guard it anyway.
  const darkShare = total === 0 ? 50 : (dark / total) * 100

  return (
    <div className={styles.score} style={cssVars({ '--dark-share': `${darkShare}%` })}>
      <span
        className={styles.side}
        data-player={Player.dark}
        data-turn={currentPlayer === Player.dark || undefined}
      >
        <span className={styles.swatch} data-player={Player.dark} aria-hidden="true" />
        {gameCopy.scoreLabel(darkName, dark)}
      </span>
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.fill} />
      </span>
      <span
        className={styles.side}
        data-player={Player.light}
        data-turn={currentPlayer === Player.light || undefined}
      >
        {gameCopy.scoreLabel(lightName, light)}
        <span className={styles.swatch} data-player={Player.light} aria-hidden="true" />
      </span>
    </div>
  )
}
