import { Fragment, ReactNode, useState } from 'react'
import styles from './DataTable.module.scss'

export type Column<T> = {
  key: string
  header: string
  numeric?: boolean // right-align + tabular figures
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  // When provided, each row is expandable to reveal secondary detail.
  renderExpanded?: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading,
  error,
  emptyMessage = 'Nothing here yet.',
  renderExpanded,
}: DataTableProps<T>) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const span = columns.length

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.numeric ? styles.numCol : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={span} className={styles.state}>
                Loading…
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td colSpan={span} className={`${styles.state} ${styles.errorState}`}>
                {error}
              </td>
            </tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr>
              <td colSpan={span} className={styles.state}>
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            rows.map((row) => {
              const key = getRowKey(row)
              const isExpandable = Boolean(renderExpanded)
              const isOpen = expanded === key
              const toggle = () => setExpanded(isOpen ? null : key)
              return (
                <Fragment key={key}>
                  <tr
                    className={isExpandable ? styles.expandable : undefined}
                    role={isExpandable ? 'button' : undefined}
                    tabIndex={isExpandable ? 0 : undefined}
                    aria-expanded={isExpandable ? isOpen : undefined}
                    onClick={isExpandable ? toggle : undefined}
                    onKeyDown={
                      isExpandable
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggle()
                            }
                          }
                        : undefined
                    }
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.numeric ? styles.numCol : undefined}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                  {isExpandable && isOpen && (
                    <tr className={styles.detailRow}>
                      <td colSpan={span}>{renderExpanded?.(row)}</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
