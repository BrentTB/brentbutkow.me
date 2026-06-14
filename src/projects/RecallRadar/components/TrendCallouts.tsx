import { TrendDirection } from '../trend-callouts'
import type { TrendCallout } from '../trend-callouts'
import styles from './TrendCallouts.module.scss'

const DIRECTION_ARROW: Record<TrendDirection, string> = {
  [TrendDirection.up]: '↑',
  [TrendDirection.down]: '↓',
  [TrendDirection.flat]: '→',
}

type TrendCalloutsProps = {
  callouts: TrendCallout[]
}

export function TrendCallouts({ callouts }: TrendCalloutsProps) {
  if (callouts.length === 0) {
    return null
  }

  return (
    <ul className={styles.strip}>
      {callouts.map((callout) => (
        <li key={callout.id} className={styles.card}>
          <span className={`${styles.value} ${callout.direction ? styles[callout.direction] : ''}`}>
            {callout.direction && (
              <span aria-hidden="true" className={styles.arrow}>
                {DIRECTION_ARROW[callout.direction]}
              </span>
            )}
            {callout.value}
          </span>
          <span className={styles.label}>{callout.label}</span>
          <span className={styles.detail}>{callout.detail}</span>
        </li>
      ))}
    </ul>
  )
}
