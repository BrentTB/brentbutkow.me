import { ReactNode } from 'react'
import { Breadcrumb } from './Breadcrumb'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  /** Nearest real ancestor for detail routes whose trailing URL segments have no page of their own
   *  (passed through to the breadcrumb). */
  parentPath?: string
  /** Optional intro line under the title — the tool pages' tagline. */
  children?: ReactNode
}

export function PageHeader({ title, parentPath, children }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.rail}>
        <Breadcrumb parentPath={parentPath} />
      </div>
      <h1 className={styles.title}>{title}</h1>
      {children && <p className={styles.subtitle}>{children}</p>}
    </div>
  )
}
