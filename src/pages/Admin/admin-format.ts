// Render an ISO timestamp as a compact local date-time; em dash for missing values.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Join a list for a table cell; em dash when empty so columns never look broken.
export function joinList(values: string[]): string {
  return values.length === 0 ? '—' : values.join(', ')
}
