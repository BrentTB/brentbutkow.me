import { useLocation } from 'react-router-dom'
import { FunItem } from '../../../data/data.types'
import styles from './FunCard.module.scss'
import { ArticleOrLinkCard } from '../../../components/cards/ArticleOrLinkCard'

type FunCardProps = {
  item: FunItem
}

function FunCard({ item }: FunCardProps) {
  const location = useLocation()

  const content = (
    <>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.description}>{item.description}</p>
    </>
  )

  const href = item.link ? `${location.pathname}${item.link}` : undefined

  return (
    <ArticleOrLinkCard href={href} className={styles.card} internal={true}>
      {content}
    </ArticleOrLinkCard>
  )
}

export default FunCard
