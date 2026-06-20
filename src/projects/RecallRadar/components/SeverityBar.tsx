import { severityColors, severityLabels, severityOrder } from '../data'
import { formatNumber } from '../chart-format'
import type { LabelCount } from '../recall.types'
import styles from './SeverityBar.module.scss'

type SeverityBarProps = {
  data: LabelCount[]
}

// A single stacked bar of the severity mix (worst-first) with a legend. Display-only — sort by
// severity to actually surface the severe recalls.
export function SeverityBar({ data }: SeverityBarProps) {
  const counts = new Map(data.map((entry) => [entry.label, entry.count]))
  // Total tracks only the known bands the bar renders, so widths sum to 100% and "N recalls"
  // matches the segments even if an unrecognised label slips into the data.
  const present = severityOrder
    .map((level) => ({ level, count: counts.get(level) ?? 0 }))
    .filter((segment) => segment.count > 0)
  const total = present.reduce((sum, segment) => sum + segment.count, 0)
  if (total === 0) return null

  const segments = present.map((segment) => ({ ...segment, pct: (segment.count / total) * 100 }))

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className={styles.title}>Severity mix</span>
        <span className={styles.total}>{formatNumber(total)} recalls</span>
      </div>
      <div className={styles.bar} role="img" aria-label="Recall severity distribution">
        {segments.map((segment) => (
          <span
            key={segment.level}
            className={styles.segment}
            style={{ width: `${segment.pct}%`, background: severityColors[segment.level] }}
            title={`${severityLabels[segment.level]}: ${formatNumber(segment.count)} (${Math.round(segment.pct)}%)`}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {segments.map((segment) => (
          <li key={segment.level} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: severityColors[segment.level] }} />
            <span>{severityLabels[segment.level]}</span>
            <span className={styles.legendCount}>{Math.round(segment.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
