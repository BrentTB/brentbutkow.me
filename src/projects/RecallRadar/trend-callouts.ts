import { categoryLabels } from './data'
import { AnomalyScope, isRecallCategory } from './recall.types'
import type { Anomaly, AnomalyMonth, MonthCount, RecallStats } from './recall.types'
import { stateGrid } from './us-state-grid'

// Direction of a trend — values double as the CSS-module class names.
export const TrendDirection = { up: 'up', down: 'down', flat: 'flat' } as const
export type TrendDirection = (typeof TrendDirection)[keyof typeof TrendDirection]

export type TrendCallout = {
  id: string
  label: string
  value: string
  detail: string
  direction?: TrendDirection
  anomaly?: boolean
  // Present on anomaly callouts — the window plus every flagged month, to chart when opened.
  chart?: { series: MonthCount[]; months: AnomalyMonth[] }
}

const stateNames = new Map(stateGrid.map((tile) => [tile.code, tile.name]))

function share(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

// Headline insights derived from the aggregate stats — no per-recall data needed.
export function deriveCallouts(stats: RecallStats): TrendCallout[] {
  const callouts: TrendCallout[] = []

  // Volume trend: a recent window of months vs the equal window before it.
  // Sort chronologically first — the windowing relies on ascending order ('YYYY-MM' sorts lexically).
  const months = stats.byMonth.slice().sort((a, b) => a.month.localeCompare(b.month))
  if (months.length >= 2) {
    const window = months.length >= 6 ? 3 : 1
    const recent = months.slice(-window)
    const previous = months.slice(-window * 2, -window)
    const previousSum = previous.reduce((sum, month) => sum + month.count, 0)
    if (previous.length === window && previousSum > 0) {
      const recentSum = recent.reduce((sum, month) => sum + month.count, 0)
      const change = Math.round(((recentSum - previousSum) / previousSum) * 100)
      const span = window === 1 ? 'month' : `${window} months`
      callouts.push({
        id: 'volume',
        label: 'Recall volume',
        value: `${change > 0 ? '+' : ''}${change}%`,
        detail: `over the last ${span} vs the prior ${span}`,
        direction:
          change > 0 ? TrendDirection.up : change < 0 ? TrendDirection.down : TrendDirection.flat,
      })
    }
  }

  // Leading cause as a share of all recalls.
  const topCause = stats.byCategory.slice().sort((a, b) => b.count - a.count)[0]
  if (topCause && stats.total > 0) {
    callouts.push({
      id: 'cause',
      label: categoryLabels[topCause.category],
      value: `${share(topCause.count, stats.total)}%`,
      detail: 'the leading cause of recalls',
    })
  }

  // Geographic concentration — byState is already sorted by count.
  const topState = stats.byState[0]
  if (topState && stats.total > 0) {
    callouts.push({
      id: 'state',
      label: stateNames.get(topState.label) ?? topState.label,
      value: `${share(topState.count, stats.total)}%`,
      detail: 'of recalls come from one state',
    })
  }

  return callouts
}

// Backend-detected spikes (robust z-score) → callouts, flagged so the UI marks them as anomalies.
// Each anomaly is one "thing" with ≥1 flagged month; the headline uses its strongest month.
export function anomalyCallouts(anomalies: Anomaly[]): TrendCallout[] {
  return anomalies.map((anomaly) => {
    const peak = anomaly.months.reduce((a, b) => (Math.abs(b.z) > Math.abs(a.z) ? b : a))
    const up = peak.z > 0
    const label =
      anomaly.scope === AnomalyScope.category && isRecallCategory(anomaly.label)
        ? categoryLabels[anomaly.label]
        : anomaly.label
    const sortedMonths = anomaly.months.map((month) => month.month).sort()
    const detail =
      anomaly.months.length === 1
        ? `${up ? 'spiked' : 'dropped'} in ${peak.month} (${peak.observed} vs ~${Math.round(peak.baseline)})`
        : `${anomaly.months.length} unusual months · latest ${sortedMonths[sortedMonths.length - 1]}`
    return {
      id: `anomaly-${anomaly.scope}-${anomaly.label}`,
      label,
      value: `${up ? '+' : ''}${peak.z}σ`,
      detail,
      direction: up ? TrendDirection.up : TrendDirection.down,
      anomaly: true,
      chart: { series: anomaly.series, months: anomaly.months },
    }
  })
}
