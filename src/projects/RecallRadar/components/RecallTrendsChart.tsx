import { formatMonthLabel, formatNumber, seriesMax } from '../chart-format'
import type { ForecastPoint } from '../recall.types'
import type { ChartMonth, ChartSegment } from '../trend-chart'
import { ChartTooltip } from './ChartTooltip'
import { useChartTooltip } from './useChartTooltip'
import styles from './RecallTrendsChart.module.scss'

type RecallTrendsChartProps = {
  data: ChartMonth[]
  year: number
  legend: ChartSegment[]
  // Overall-volume projection for the upcoming months; only the points landing in `year` after the
  // latest actual month are drawn (a ghost bar + band). Pass only on the unfiltered chart, where the
  // stacked totals represent the same overall series the forecast was fit on.
  forecast?: ForecastPoint[]
}

const WIDTH = 720
const HEIGHT = 240
const PADDING = { top: 16, right: 12, bottom: 36, left: 44 }

export function RecallTrendsChart({ data, year, legend, forecast }: RecallTrendsChartProps) {
  const { figureRef, tip, showTip, hideTip } = useChartTooltip()

  const months = data.slice(-12)
  if (months.length === 0) {
    return <p className={styles.empty}>No trend data yet.</p>
  }

  const totals = months.map((month) => month.segments.reduce((sum, seg) => sum + seg.count, 0))
  // The last month that actually has recalls — projected bars only appear *after* it, so the
  // in-progress month keeps its (partial) real bar and the future shows as a ghost.
  const latestActual = months.reduce(
    (latest, month, index) => (totals[index] > 0 ? month.month : latest),
    ''
  )
  const forecastByMonth = new Map(
    (forecast ?? [])
      .filter((point) => point.month.startsWith(`${year}-`) && point.month > latestActual)
      .map((point) => [point.month, point])
  )
  // Scale to the actual stacks and the projected values — not the forecast's upper band, which can
  // sit far above them and would shrink every real month to fit. The uncertainty band clamps to the
  // plot top instead. Round up to a whole recall so the axis reads as a count, not a "318.1" glitch.
  const maxCount = Math.ceil(
    seriesMax([...totals, ...[...forecastByMonth.values()].map((point) => point.predicted)])
  )
  const plotW = WIDTH - PADDING.left - PADDING.right
  const plotH = HEIGHT - PADDING.top - PADDING.bottom
  const slot = plotW / months.length
  const barW = Math.min(slot * 0.6, 48)
  const stacked = legend.length > 1
  const y = (count: number) => PADDING.top + plotH - (count / maxCount) * plotH
  const barX = (index: number) => PADDING.left + index * slot + (slot - barW) / 2

  return (
    <figure className={styles.figure} ref={figureRef}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        role="img"
        aria-label={`Monthly food recall counts for ${year}`}
      >
        <defs>
          <pattern
            id="forecastHatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" className={styles.hatchBg} />
            <line x1="0" y1="0" x2="0" y2="6" className={styles.hatchLine} />
          </pattern>
        </defs>
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
          const x = barX(index)
          const fullLabel = formatMonthLabel(month.month)
          const showLabel = months.length <= 6 || index % 2 === 0
          let top = PADDING.top + plotH // stack upward from the axis
          return (
            <g key={month.month}>
              {/* Full-column hit area behind the bars: hovering the empty space above (or beside) a
                  stack reports the month's total, since the segment rects on top only cover the bar
                  itself. Skipped on forecast months, where the ghost bar carries its own tooltip. */}
              {!forecastByMonth.has(month.month) && (
                <rect
                  x={PADDING.left + index * slot}
                  y={PADDING.top}
                  width={slot}
                  height={plotH}
                  className={styles.hit}
                  aria-hidden="true"
                  onMouseEnter={showTip(`${fullLabel} · ${formatNumber(totals[index])} recalls`)}
                  onMouseMove={showTip(`${fullLabel} · ${formatNumber(totals[index])} recalls`)}
                  onMouseLeave={hideTip}
                />
              )}
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

        {months.map((month, index) => {
          const point = forecastByMonth.get(month.month)
          if (!point) return null
          const x = barX(index)
          const predicted = Math.round(point.predicted)
          const text =
            `${formatMonthLabel(month.month)} · projected ${formatNumber(predicted)} ` +
            `(range ${formatNumber(Math.round(point.lower))}–${formatNumber(Math.round(point.upper))})`
          // The uncertainty range as a soft shaded band behind the ghost bar, clamped to the plot —
          // reads as "roughly this range" instead of a towering error bar dwarfing the real months.
          const bandTop = Math.max(PADDING.top, y(point.upper))
          const bandHeight = Math.max(0, y(point.lower) - bandTop)
          return (
            <g key={`forecast-${month.month}`}>
              <rect
                x={x}
                y={bandTop}
                width={barW}
                height={bandHeight}
                className={styles.forecastBand}
                aria-hidden="true"
              />
              <rect
                x={x}
                y={y(point.predicted)}
                width={barW}
                height={Math.max(0, PADDING.top + plotH - y(point.predicted))}
                rx={3}
                fill="url(#forecastHatch)"
                className={styles.forecastBar}
                aria-label={text}
                onMouseEnter={showTip(text)}
                onMouseMove={showTip(text)}
                onMouseLeave={hideTip}
              />
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

      {forecastByMonth.size > 0 && (
        <p className={styles.forecastNote}>
          <span className={styles.forecastSwatch} aria-hidden="true" />
          Projected — upcoming months with a typical-error band
        </p>
      )}

      <ChartTooltip tip={tip} />
    </figure>
  )
}
