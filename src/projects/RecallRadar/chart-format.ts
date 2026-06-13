// Fixed locale keeps formatting deterministic across environments (and tests).
const LOCALE = 'en-US'

// month is 'YYYY-MM' → 'Mar 2026'
export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  const date = new Date(year ?? 0, (monthIndex ?? 1) - 1, 1)
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' }).format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value)
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
