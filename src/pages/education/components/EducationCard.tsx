import { useState } from 'react'
// import { ArticleOrLink } from '../../../components/ArticleOrLink'
import { Education } from '../../../data/data.types'
import styles from './EducationCard.module.scss'

type EducationCardProps = {
  item: Education
}
const ACHIEVEMENTS_TO_SHOW = 2
function EducationCard({ item }: EducationCardProps) {
  const [showAllAchievements, setShowAllAchievements] = useState(false)

  const hideAchievements = item.achievements && item.achievements.length > ACHIEVEMENTS_TO_SHOW

  const achievementClass = hideAchievements
    ? `${styles.achievement} ${styles.clickable}`
    : styles.achievement

  const achievements =
    showAllAchievements || !hideAchievements
      ? item.achievements
      : item.achievements?.slice(0, ACHIEVEMENTS_TO_SHOW).concat('...')

  const content = (
    <>
      <header className={styles.header}>
        <div>
          <h3 className={styles.degree}>{item.degree}</h3>
          <p className={styles.institution}>{item.institution}</p>
          {/* {item.link && <span className={styles.linkIcon}>↗</span>} */}
        </div>
        <span className={styles.period}>{item.period}</span>
      </header>

      {item.description.map((description) => (
        <p className={styles.description}>{description}</p>
      ))}
      {achievements && achievements.length > 0 && (
        <ul className={styles.achievements}>
          {achievements.map((achievement) => (
            <li
              key={achievement}
              className={achievementClass}
              onClick={() => setShowAllAchievements(!showAllAchievements)}
            >
              {achievement}
            </li>
          ))}
        </ul>
      )}
    </>
  )
  return (
    // <ArticleOrLink className={styles.card} href={item.link}>
    //   {content}
    // </ArticleOrLink>
    <article className={styles.card}>{content}</article>
  )
}

export default EducationCard
