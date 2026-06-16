import { useRef, useState, type MouseEvent } from 'react'
import { formatMonthLabel, formatNumber, median, seriesMax } from '../chart-format'
import type { AnomalyMonth, MonthCount } from '../recall.types'
import { ChartTooltip, type TooltipState } from './ChartTooltip'
import styles from './AnomalyChart.module.scss'

type AnomalyChartProps = {
  series: MonthCount[]
  months: AnomalyMonth[] // every flagged month — all highlighted on the one chart
  label: string
}

const WIDTH = 720
const HEIGHT = 200
const PADDING = { top: 18, right: 12, bottom: 30, left: 44 }

// Short tick like "Mar ’26" from a 'YYYY-MM' month.
function tick(month: string): string {
  const [mon, year] = formatMonthLabel(month).split(' ')
  return year ? `${mon} ’${year.slice(2)}` : mon
}

export function AnomalyChart({ series, months, label }: AnomalyChartProps) {
  const figureRef = useRef<HTMLElement>(null)
  const [tip, setTip] = useState<TooltipState>(null)

  if (series.length === 0) return null

  const showTip = (text: string) => (event: MouseEvent) => {
    const rect = figureRef.current?.getBoundingClientRect()
    if (rect) setTip({ text, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const flagged = new Set(months.map((month) => month.month))
  // Reference line = the typical (median) monthly level over the window, so the spikes stand out.
  const baseline = median(series.map((entry) => entry.count))

  const maxCount = seriesMax([...series.map((entry) => entry.count), baseline])
  const plotW = WIDTH - PADDING.left - PADDING.right
  const plotH = HEIGHT - PADDING.top - PADDING.bottom
  const slot = plotW / series.length
  const barW = Math.min(slot * 0.7, 34)
  const baselineY = PADDING.top + plotH - (baseline / maxCount) * plotH

  return (
    <figure className={styles.figure} ref={figureRef}>
      <figcaption className={styles.caption}>
        Typical ~{formatNumber(Math.round(baseline))}/month (dashed line); flagged months in amber.
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        role="img"
        aria-label={`Monthly ${label} recalls; ${months.length} month(s) flagged as unusual`}
      >
        <text
          x={PADDING.left - 8}
          y={PADDING.top + 4}
          textAnchor="end"
          className={styles.axisLabel}
        >
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
          className={styles.axisLabel}
        >
          0
        </text>

        {/* Typical (median) level — the flagged bars' height vs this line is the anomaly. */}
        <line
          x1={PADDING.left}
          y1={baselineY}
          x2={WIDTH - PADDING.right}
          y2={baselineY}
          className={styles.baseline}
        />

        {series.map((entry, index) => {
          const barH = (entry.count / maxCount) * plotH
          const x = PADDING.left + index * slot + (slot - barW) / 2
          const y = PADDING.top + plotH - barH
          const isFlagged = flagged.has(entry.month)
          // Evenly-spaced reference ticks only — the amber bars + tooltips already mark the spikes,
          // so we don't add a tick per flagged month (which would collide with these).
          const showLabel = index % 4 === 0
          const text = `${formatMonthLabel(entry.month)}: ${formatNumber(entry.count)}`
          return (
            <g key={entry.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                className={isFlagged ? styles.barFlagged : styles.bar}
                aria-label={text}
                onMouseEnter={showTip(text)}
                onMouseMove={showTip(text)}
                onMouseLeave={() => setTip(null)}
              />
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={HEIGHT - PADDING.bottom + 16}
                  textAnchor="middle"
                  className={isFlagged ? styles.tickFlagged : styles.axisLabel}
                >
                  {tick(entry.month)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <ChartTooltip tip={tip} />
    </figure>
  )
}
