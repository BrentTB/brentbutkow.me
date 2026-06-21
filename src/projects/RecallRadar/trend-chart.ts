import { categoryLabels, severityLabels, sourceLabels, trendColor } from './data'
import {
  RecallCategory,
  RecallClass,
  RecallSource,
  SeverityLabel,
  TrendGroup,
  isRecallCategory,
  isRecallSource,
  isSeverityLabel,
} from './recall.types'
import type { TrendResult } from './recall.types'

// Mirrors the backend's coalesce of the nullable classification column (service.get_trend).
const UNCLASSIFIED = 'Unclassified'

export type ChartSegment = { key: string; label: string; color: string; count: number }
export type ChartMonth = { month: string; segments: ChartSegment[] }

// The full candidate key set per dimension; toChartMonths keeps the present ones and orders them
// by volume. Colors are keyed by value (see trendColor), so order never affects them.
function keysFor(group: TrendGroup): string[] {
  if (group === TrendGroup.category) return Object.values(RecallCategory)
  if (group === TrendGroup.source) return Object.values(RecallSource)
  if (group === TrendGroup.severity) return Object.values(SeverityLabel)
  // Both countries' classes (filtered to present), plus the coalesced-null segment.
  if (group === TrendGroup.classification) return [...Object.values(RecallClass), UNCLASSIFIED]
  return ['total']
}

function labelFor(group: TrendGroup, key: string): string {
  if (group === TrendGroup.category && isRecallCategory(key)) return categoryLabels[key]
  if (group === TrendGroup.source && isRecallSource(key)) return sourceLabels[key]
  if (group === TrendGroup.severity && isSeverityLabel(key)) return severityLabels[key]
  if (group === TrendGroup.classification) return key // class names are already human labels
  return 'Recalls'
}

// Pivot long-format buckets into the selected year's 12 months, one segment per present group key.
export function toChartMonths(
  result: TrendResult,
  year: number
): { months: ChartMonth[]; legend: ChartSegment[] } {
  const counts = new Map<string, Map<string, number>>()
  for (const bucket of result.buckets) {
    const row = counts.get(bucket.month) ?? new Map<string, number>()
    row.set(bucket.group, bucket.count)
    counts.set(bucket.month, row)
  }

  const totals = new Map<string, number>()
  for (const bucket of result.buckets) {
    totals.set(bucket.group, (totals.get(bucket.group) ?? 0) + bucket.count)
  }
  // Largest cause first — order segments by total recalls, not the enum's fixed order.
  const present = keysFor(result.group)
    .filter((key) => result.buckets.some((b) => b.group === key))
    .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0))
  const keys = present.length > 0 ? present : ['total']
  const legend: ChartSegment[] = keys.map((key) => ({
    key,
    label: labelFor(result.group, key),
    color: trendColor(result.group, key),
    count: 0,
  }))

  const months: ChartMonth[] = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    const row = counts.get(month)
    return { month, segments: legend.map((seg) => ({ ...seg, count: row?.get(seg.key) ?? 0 })) }
  })
  return { months, legend }
}
