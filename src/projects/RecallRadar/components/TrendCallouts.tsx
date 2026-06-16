import { useState } from 'react'
import { TrendDirection } from '../trend-callouts'
import type { TrendCallout } from '../trend-callouts'
import { AnomalyChart } from './AnomalyChart'
import styles from './TrendCallouts.module.scss'

const DIRECTION_ARROW: Record<TrendDirection, string> = {
  [TrendDirection.up]: '↑',
  [TrendDirection.down]: '↓',
  [TrendDirection.flat]: '→',
}

type TrendCalloutsProps = {
  callouts: TrendCallout[]
}

function CardBody({ callout, open }: { callout: TrendCallout; open?: boolean }) {
  return (
    <>
      {callout.anomaly && (
        <span className={styles.tag}>
          Anomaly
          {callout.chart && (
            <span
              aria-hidden="true"
              className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            >
              ▾
            </span>
          )}
        </span>
      )}
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
    </>
  )
}

export function TrendCallouts({ callouts }: TrendCalloutsProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (callouts.length === 0) {
    return null
  }

  const open = callouts.find((callout) => callout.id === openId && callout.chart)

  return (
    <>
      <ul className={styles.strip} aria-label="Trend highlights">
        {callouts.map((callout) => {
          const isOpen = callout.id === openId
          return (
            <li key={callout.id} className={styles.cell}>
              {callout.chart ? (
                <button
                  type="button"
                  className={`${styles.card} ${styles.anomaly} ${styles.clickable} ${
                    isOpen ? styles.active : ''
                  }`}
                  aria-expanded={isOpen}
                  aria-controls="anomaly-chart"
                  onClick={() => setOpenId(isOpen ? null : callout.id)}
                >
                  <CardBody callout={callout} open={isOpen} />
                </button>
              ) : (
                <div className={`${styles.card} ${callout.anomaly ? styles.anomaly : ''}`}>
                  <CardBody callout={callout} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {open?.chart && (
        <div className={styles.chartPanel} id="anomaly-chart">
          <div className={styles.chartHead}>
            <span className={styles.chartTitle}>{open.label} — recalls per month</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpenId(null)}
              aria-label="Close chart"
            >
              ×
            </button>
          </div>
          <AnomalyChart series={open.chart.series} months={open.chart.months} label={open.label} />
        </div>
      )}
    </>
  )
}
