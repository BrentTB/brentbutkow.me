import { ReactNode } from 'react'
import styles from './PageLayout.module.css'

interface PageLayoutProps {
  children: ReactNode
}

function PageLayout({ children }: PageLayoutProps) {
  return <main className={styles.main}>{children}</main>
}

export default PageLayout
