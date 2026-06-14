import { categoryLabels } from './data'
import type { RecallStats } from './recall.types'
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
