import { FunItem } from '../../../data/data.types'
import styles from './FunCard.module.scss'
import { ArticleOrLink } from '../../../components/ArticleOrLink'

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
    <ArticleOrLink href={item.link} className={styles.card}>
      {content}
    </ArticleOrLink>
  )
}

export default FunCard
