import { ReactNode } from 'react'
import styles from './PageLayout.module.scss'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return <main className={styles.main}>{children}</main>
}
