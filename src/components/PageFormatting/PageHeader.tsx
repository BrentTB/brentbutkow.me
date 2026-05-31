import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
}

function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}

export default PageHeader
