import { FunItem } from '../../../data/data.types'
import styles from './FunCard.module.scss'
import { ArticleOrLinkCard } from '../../../components/cards/ArticleOrLinkCard'

type FunCardProps = {
  item: FunItem
}

function FunCard({ item }: FunCardProps) {
  const content = (
    <>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.description}>{item.description}</p>
      {item.link && <span className={styles.linkIcon}>↗</span>}
    </>
  )

  return (
    <ArticleOrLinkCard href={item.link} className={styles.card}>
      {content}
    </ArticleOrLinkCard>
  )
}

export default FunCard
