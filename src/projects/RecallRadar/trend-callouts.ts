import { formatMonthLabel, formatNumber } from './chart-format'
import { categoryLabels } from './data'
import { AnomalyScope, isRecallCategory } from './recall.types'
import type { Anomaly, AnomalyMonth, ForecastPoint, MonthCount, RecallStats } from './recall.types'

// Direction of a trend — values double as the CSS-module class names.
export const TrendDirection = { up: 'up', down: 'down', flat: 'flat' } as const
export type TrendDirection = (typeof TrendDirection)[keyof typeof TrendDirection]

// A headline card: eyebrow (what it measures) · value (the number) · title (the subject) · caption.
// The shared shape lets descriptive insights and detected anomalies render through one component.
export type TrendCallout = {
  id: string
  eyebrow: string
  value: string
  title?: string
  caption: string
  direction?: TrendDirection
  anomaly?: boolean
  // Present on anomaly callouts — the window plus every flagged month, to chart when opened.
  chart?: { series: MonthCount[]; months: AnomalyMonth[] }
}

// The volume-trend highlight derived from the monthly series. The leading-cause + top-state figures
// the old cards showed now live in the status strip, so they're not repeated here.
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
        eyebrow: 'Recall volume',
        value: `${change > 0 ? '+' : ''}${change}%`,
        caption: `over the last ${span} vs the prior ${span}`,
        direction:
          change > 0 ? TrendDirection.up : change < 0 ? TrendDirection.down : TrendDirection.flat,
      })
    }
  }

  return callouts
}

// Forward-looking outlook from the self-built seasonal forecaster (overall volume). Headlines the
// projected monthly average + a ±band, and reads the direction off the projection vs recent actuals.
// Returns null when there's no forecast (history too short) — no card rather than a hollow one.
export function forecastCallout(
  forecast: ForecastPoint[],
  byMonth: MonthCount[]
): TrendCallout | null {
  if (forecast.length === 0) return null
  const horizon = forecast.length
  const projectedAvg = forecast.reduce((sum, point) => sum + point.predicted, 0) / horizon
  // The ±: average half-width of the band across the horizon.
  const band = forecast.reduce((sum, point) => sum + (point.upper - point.lower) / 2, 0) / horizon

  // Direction: projected average vs the same number of recent *complete* months (drop the
  // in-progress final month so the baseline isn't understated by a partial count).
  const months = byMonth.slice().sort((a, b) => a.month.localeCompare(b.month))
  const recent = months.slice(-(horizon + 1), -1)
  const recentAvg = recent.length
    ? recent.reduce((sum, month) => sum + month.count, 0) / recent.length
    : projectedAvg
  const change = recentAvg > 0 ? ((projectedAvg - recentAvg) / recentAvg) * 100 : 0
  const direction =
    change > 5 ? TrendDirection.up : change < -5 ? TrendDirection.down : TrendDirection.flat
  const trend =
    direction === TrendDirection.up
      ? 'trending up'
      : direction === TrendDirection.down
        ? 'trending down'
        : 'holding steady'

  return {
    id: 'forecast',
    eyebrow: 'Outlook',
    value: `~${formatNumber(Math.round(projectedAvg))}/mo`,
    caption: `next ${horizon} months · ±${formatNumber(Math.round(band))} · ${trend}`,
    direction,
  }
}

// Backend-detected spikes (robust z-score) → callouts, flagged so the UI marks them as anomalies.
// Each anomaly is one "thing" with ≥1 flagged month; the headline uses its strongest month, and
// states the magnitude in plain language (count vs the typical monthly level) — no z-score jargon.
export function anomalyCallouts(anomalies: Anomaly[]): TrendCallout[] {
  return anomalies.map((anomaly) => {
    // Headline the biggest month and whether it's above/below the typical level — no z-score jargon.
    const peak = anomaly.months.reduce((a, b) => (b.observed > a.observed ? b : a))
    const up = peak.observed >= peak.baseline
    const title =
      anomaly.scope === AnomalyScope.category && isRecallCategory(anomaly.label)
        ? categoryLabels[anomaly.label]
        : anomaly.label
    const sortedMonths = anomaly.months.map((month) => month.month).sort()
    const latest = sortedMonths[sortedMonths.length - 1] ?? peak.month
    // Always say which way it broke (a dip reads the same as a spike otherwise) and against what
    // typical level — both single- and multi-month so the baseline magnitude is never dropped.
    const vsTypical = `${up ? 'above' : 'below'} ~${Math.round(peak.baseline)}/mo typical`
    const caption =
      anomaly.months.length === 1
        ? `${formatMonthLabel(peak.month)} · ${vsTypical}`
        : `${anomaly.months.length} unusual months · latest ${formatMonthLabel(latest)} · ${vsTypical}`
    return {
      id: `anomaly-${anomaly.scope}-${anomaly.label}`,
      eyebrow: 'Anomaly',
      value: formatNumber(peak.observed),
      title,
      caption,
      direction: up ? TrendDirection.up : TrendDirection.down,
      anomaly: true,
      chart: { series: anomaly.series, months: anomaly.months },
    }
  })
}
