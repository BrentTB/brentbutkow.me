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

// One dense line: eyebrow · value (+ direction arrow) · subject · context — and a chevron on the
// anomaly rows that expand a chart.
function RowBody({ callout, open }: { callout: TrendCallout; open?: boolean }) {
  return (
    <>
      <span className={styles.eyebrow}>{callout.eyebrow}</span>
      <span className={`${styles.value} ${callout.direction ? styles[callout.direction] : ''}`}>
        {callout.direction && (
          <span aria-hidden="true" className={styles.arrow}>
            {DIRECTION_ARROW[callout.direction]}
          </span>
        )}
        {callout.value}
      </span>
      {callout.title && <span className={styles.title}>{callout.title}</span>}
      <span className={styles.caption}>{callout.caption}</span>
      {callout.chart && (
        <span aria-hidden="true" className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
          ▾
        </span>
      )}
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
      <ul className={styles.rows} aria-label="Trend highlights">
        {callouts.map((callout) => {
          const isOpen = callout.id === openId
          return (
            <li key={callout.id} className={styles.cell}>
              {callout.chart ? (
                <button
                  type="button"
                  className={`${styles.row} ${styles.anomaly} ${styles.clickable} ${
                    isOpen ? styles.active : ''
                  }`}
                  aria-expanded={isOpen}
                  // Only the open row references the single panel — avoids a dangling idref while
                  // closed and many rows all claiming to control one panel.
                  aria-controls={isOpen ? 'anomaly-chart' : undefined}
                  onClick={() => setOpenId(isOpen ? null : callout.id)}
                >
                  <RowBody callout={callout} open={isOpen} />
                </button>
              ) : (
                <div className={styles.row}>
                  <RowBody callout={callout} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {open?.chart && (
        <div className={styles.chartPanel} id="anomaly-chart">
          <div className={styles.chartHead}>
            <span className={styles.chartTitle}>
              {open.title ?? open.eyebrow} — recalls per month
            </span>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpenId(null)}
              aria-label="Close chart"
            >
              ×
            </button>
          </div>
          <AnomalyChart
            series={open.chart.series}
            months={open.chart.months}
            label={open.title ?? ''}
          />
        </div>
      )}
    </>
  )
}
