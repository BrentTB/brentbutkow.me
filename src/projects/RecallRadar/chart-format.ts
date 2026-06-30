import type { MonthCount } from './recall.types'

// Fixed locale keeps formatting deterministic across environments (and tests).
const LOCALE = 'en-US'

// month is 'YYYY-MM' → 'Mar 2026'; malformed input falls back to the raw string.
export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  const date = new Date(year ?? 0, (monthIndex ?? 1) - 1, 1)
  if (Number.isNaN(date.getTime())) return month
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value)
}

// `${count} <unit>` with the plural form picked by count: pluralize(2, 'company', 'companies') → '2 companies'.
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

// Largest count in a chart series, floored at 1 so an all-zero series divides safely.
export function seriesMax(counts: number[]): number {
  return Math.max(...counts, 1)
}

// Median of a numeric series (the "typical" level a chart's baseline line is drawn at).
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// iso is 'YYYY-MM-DD' → 'Mar 1, 2026'
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Distinct years present in the monthly data, newest first.
export function deriveYears(byMonth: MonthCount[]): number[] {
  const years = new Set<number>()
  for (const entry of byMonth) {
    const year = Number(entry.month.slice(0, 4))
    if (Number.isFinite(year)) years.add(year)
  }
  return [...years].sort((a, b) => b - a)
}

// A full Jan–Dec series for `year`, filling any missing months with 0.
export function monthsForYear(byMonth: MonthCount[], year: number): MonthCount[] {
  const counts = new Map(byMonth.map((entry) => [entry.month, entry.count]))
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    return { month, count: counts.get(month) ?? 0 }
  })
}

export type IngestFreshness = { stale: boolean; label: string }

const STALE_AFTER_HOURS = 48

function relativeAge(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${pluralize(Math.round(hours), 'hour', 'hours')} ago`
  return `${pluralize(Math.round(hours / 24), 'day', 'days')} ago`
}

// Freshness of the data from the last successful ingest. `now` is injected for testability.
export function ingestFreshness(lastIngestAt: string | null, now: Date): IngestFreshness {
  if (!lastIngestAt) return { stale: true, label: 'No data ingested yet' }
  const ingested = new Date(lastIngestAt)
  if (Number.isNaN(ingested.getTime())) return { stale: true, label: 'Update time unknown' }
  const hours = (now.getTime() - ingested.getTime()) / 3_600_000
  const age = relativeAge(hours)
  return hours > STALE_AFTER_HOURS
    ? { stale: true, label: `Data may be stale — last updated ${age}` }
    : { stale: false, label: `Updated ${age}` }
}
