import { formatMonthLabel, formatNumber, seriesMax } from '../chart-format'
import type { ChartMonth, ChartSegment } from '../trend-chart'
import { ChartTooltip } from './ChartTooltip'
import { useChartTooltip } from './useChartTooltip'
import styles from './RecallTrendsChart.module.scss'

type RecallTrendsChartProps = {
  data: ChartMonth[]
  year: number
  legend: ChartSegment[]
}

const WIDTH = 720
const HEIGHT = 240
const PADDING = { top: 16, right: 12, bottom: 36, left: 44 }

export function RecallTrendsChart({ data, year, legend }: RecallTrendsChartProps) {
  const { figureRef, tip, showTip, hideTip } = useChartTooltip()

  const months = data.slice(-12)
  if (months.length === 0) {
    return <p className={styles.empty}>No trend data yet.</p>
  }

  const totals = months.map((month) => month.segments.reduce((sum, seg) => sum + seg.count, 0))
  const maxCount = seriesMax(totals)
  const plotW = WIDTH - PADDING.left - PADDING.right
  const plotH = HEIGHT - PADDING.top - PADDING.bottom
  const slot = plotW / months.length
  const barW = Math.min(slot * 0.6, 48)
  const stacked = legend.length > 1

  return (
    <figure className={styles.figure} ref={figureRef}>
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
          const x = PADDING.left + index * slot + (slot - barW) / 2
          const fullLabel = formatMonthLabel(month.month)
          const showLabel = months.length <= 6 || index % 2 === 0
          let top = PADDING.top + plotH // stack upward from the axis
          return (
            <g key={month.month}>
              {month.segments.map((seg) => {
                if (seg.count === 0) return null
                const barH = (seg.count / maxCount) * plotH
                top -= barH
                const text = `${fullLabel} · ${seg.label}: ${formatNumber(seg.count)}`
                return (
                  <rect
                    key={seg.key}
                    x={x}
                    y={top}
                    width={barW}
                    height={barH}
                    rx={stacked ? 0 : 3}
                    fill={seg.color}
                    className={styles.seg}
                    aria-label={text}
                    onMouseEnter={showTip(text)}
                    onMouseMove={showTip(text)}
                    onMouseLeave={hideTip}
                  />
                )
              })}
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

      {stacked && (
        <ul className={styles.legend}>
          {legend.map((seg) => (
            <li key={seg.key} className={styles.legendItem}>
              <span
                className={styles.swatch}
                style={{ background: seg.color }}
                aria-hidden="true"
              />
              {seg.label}
            </li>
          ))}
        </ul>
      )}

      <ChartTooltip tip={tip} />
    </figure>
  )
}
