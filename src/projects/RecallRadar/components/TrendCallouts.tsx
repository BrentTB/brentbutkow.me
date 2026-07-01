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

// How many anomaly rows show before the rest collapse behind "show more" — enough to lead with the
// strongest signals without the overview turning into a wall of them.
const ANOMALY_PREVIEW = 3

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
  const [expanded, setExpanded] = useState(false)
  if (callouts.length === 0) {
    return null
  }

  const open = callouts.find((callout) => callout.id === openId && callout.chart)

  // Anomalies (the chart-backed rows) can pile up, so preview a few and tuck the rest away. The
  // summary rows (outlook, volume — no chart) always show; they're the at-a-glance context.
  const anomalies = callouts.filter((callout) => callout.chart)
  const summaries = callouts.filter((callout) => !callout.chart)
  const hiddenAnomalies = Math.max(0, anomalies.length - ANOMALY_PREVIEW)
  const shownAnomalies = expanded ? anomalies : anomalies.slice(0, ANOMALY_PREVIEW)
  const shown = [...shownAnomalies, ...summaries]

  return (
    <>
      <ul className={styles.rows} aria-label="Trend highlights">
        {shown.map((callout) => {
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

      {hiddenAnomalies > 0 && (
        <button
          type="button"
          className={styles.moreToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer' : 'Show more'}
        </button>
      )}

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
