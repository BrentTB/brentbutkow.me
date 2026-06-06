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

  const external = item.link ? /^https?:\/\//.test(item.link) : false
  const prefix = external ? '' : location.pathname

  const href = item.link ? `${prefix}${item.link}` : undefined

  return (
    <ArticleOrLinkCard href={href} internal={!external}>
      {content}
    </ArticleOrLinkCard>
  )
}

export default FunCard
