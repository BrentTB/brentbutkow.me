import { formatMonthLabel, formatNumber, seriesMax } from '../chart-format'
import type { MonthCount } from '../recall.types'
import styles from './RecallTrendsChart.module.scss'

type RecallTrendsChartProps = {
  data: MonthCount[]
  year: number
}

const WIDTH = 720
const HEIGHT = 240
const PADDING = { top: 16, right: 12, bottom: 36, left: 44 }

export function RecallTrendsChart({ data, year }: RecallTrendsChartProps) {
  const months = data.slice(-12)
  if (months.length === 0) {
    return <p className={styles.empty}>No trend data yet.</p>
  }

  const maxCount = seriesMax(months.map((month) => month.count))
  const plotW = WIDTH - PADDING.left - PADDING.right
  const plotH = HEIGHT - PADDING.top - PADDING.bottom
  const slot = plotW / months.length
  const barW = Math.min(slot * 0.6, 48)

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        role="img"
        aria-label={`Monthly food recall counts for ${year}`}
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={WIDTH - PADDING.right}
          y2={PADDING.top}
          className={styles.grid}
        />
        <text x={PADDING.left - 8} y={PADDING.top + 4} textAnchor="end" className={styles.label}>
          {formatNumber(maxCount)}
        </text>
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotH}
          x2={WIDTH - PADDING.right}
          y2={PADDING.top + plotH}
          className={styles.axis}
        />
        <text
          x={PADDING.left - 8}
          y={PADDING.top + plotH + 4}
          textAnchor="end"
          className={styles.label}
        >
          0
        </text>
        {months.map((month, index) => {
          const barH = (month.count / maxCount) * plotH
          const x = PADDING.left + index * slot + (slot - barW) / 2
          const y = PADDING.top + plotH - barH
          const fullLabel = formatMonthLabel(month.month)
          const showLabel = months.length <= 6 || index % 2 === 0
          return (
            <g key={month.month}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} className={styles.bar}>
                <title>{`${fullLabel}: ${formatNumber(month.count)}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={HEIGHT - PADDING.bottom + 18}
                  textAnchor="middle"
                  className={styles.label}
                >
                  {fullLabel.split(' ')[0]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
