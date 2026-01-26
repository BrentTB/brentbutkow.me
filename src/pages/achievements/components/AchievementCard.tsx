import { ArticleOrLinkCard } from '../../../components/cards/ArticleOrLinkCard'
import { Achievement } from '../../../data/data.types'
import styles from './AchievementCard.module.scss'

type AchievementCardProps = {
  item: Achievement
}

function AchievementCard({ item }: AchievementCardProps) {
  return (
    <ArticleOrLinkCard href={item.link}>
      <h4 className={styles.title}>{item.title}</h4>
      {item.description && <p className={styles.description}>{item.description}</p>}
    </ArticleOrLinkCard>
  )
}

export default AchievementCard
