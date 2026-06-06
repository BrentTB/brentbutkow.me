import { ArticleOrLinkCard } from '../../../components/cards/ArticleOrLinkCard'
import { Achievement } from '../../../data/data.types'
import styles from './AchievementCard.module.scss'

type AchievementCardProps = {
  achievement: Achievement
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  return (
    <ArticleOrLinkCard href={achievement.link}>
      <h4 className={styles.title}>{achievement.title}</h4>
      {achievement.description && <p className={styles.description}>{achievement.description}</p>}
    </ArticleOrLinkCard>
  )
}
