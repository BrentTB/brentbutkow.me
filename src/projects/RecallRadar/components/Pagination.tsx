import styles from './Pagination.module.scss'

type PaginationProps = {
  page: number // 1-indexed
  pageSize: number
  total: number
  onChange: (page: number) => void
}

// Previous / next pager for a list of `total` items shown `pageSize` at a time. Renders nothing
// when everything fits on one page.
export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav className={styles.pagination} aria-label="Recall list pages">
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ← Previous
      </button>
      <span className={styles.status}>
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </nav>
  )
}
