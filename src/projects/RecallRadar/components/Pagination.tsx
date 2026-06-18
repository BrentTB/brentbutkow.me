import { pageWindow } from './page-window'
import styles from './Pagination.module.scss'

type PaginationProps = {
  page: number // 1-indexed
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const go = (next: number) => onChange(Math.min(totalPages, Math.max(1, next)))

  return (
    <nav className={styles.pagination} aria-label="Recall list pages">
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.step}
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          ‹
        </button>
        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`${styles.page} ${item === page ? styles.active : ''}`}
              onClick={() => go(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item}`}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          className={styles.step}
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </nav>
  )
}
