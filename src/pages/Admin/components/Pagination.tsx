import styles from './Pagination.module.scss'

type PaginationProps = {
  offset: number
  limit: number
  total: number
  onOffsetChange: (offset: number) => void
}

export function Pagination({ offset, limit, total, onOffsetChange }: PaginationProps) {
  const start = total === 0 ? 0 : offset + 1
  const end = Math.min(offset + limit, total)
  const hasPrev = offset > 0
  const hasNext = end < total

  return (
    <div className={styles.bar}>
      <span className={styles.range}>
        {start}–{end} of {total}
      </span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          disabled={!hasPrev}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
