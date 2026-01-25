import { ArticleOrLink } from '../../../components/ArticleOrLink'
import { Achievement } from '../../../data/data.types'
import styles from './AchievementCard.module.scss'

type AchievementCardProps = {
  item: Achievement
}

function AchievementCard({ item }: AchievementCardProps) {
  const content = (
    <>
      <h4 className={styles.title}>{item.title}</h4>
      {item.description && <p className={styles.description}>{item.description}</p>}
      {item.link && <span className={styles.linkIcon}>↗</span>}
    </>
  )

  return (
    <ArticleOrLink className={`${styles.card} ${item.link ? styles.link : ''}`} href={item.link}>
      {content}
    </ArticleOrLink>
  )
}

export default AchievementCard
