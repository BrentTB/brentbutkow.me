import { useLocation } from 'react-router-dom'
import { FunItem } from '../../../data/data.types'
import styles from './FunCard.module.scss'
import { ArticleOrLinkCard } from '../../../components/cards/ArticleOrLinkCard'

type FunCardProps = {
  item: FunItem
}

export function FunCard({ item }: FunCardProps) {
  const location = useLocation()

  const external = item.link ? /^https?:\/\//.test(item.link) : false
  const prefix = external ? '' : location.pathname

  const href = item.link ? `${prefix}${item.link}` : undefined

  const rowClass = item.hub ? `${styles.row} ${styles.hubRow}` : styles.row

  return (
    <ArticleOrLinkCard href={href} internal={!external}>
      <div className={rowClass}>
        <span className={styles.label}>{item.label}</span>
        <div className={styles.body}>
          <h3 className={styles.title}>
            {item.title}
            {item.hub && <span className={styles.hubCount}>{item.hub}</span>}
          </h3>
          <p className={styles.description}>{item.description}</p>
        </div>
      </div>
    </ArticleOrLinkCard>
  )
}
