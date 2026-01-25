import { Experience } from '../../../data/data.types'
import styles from './ExperienceCard.module.scss'

type ExperienceCardProps = {
  item: Experience
}

function ExperienceCard({ item }: ExperienceCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h3 className={styles.role}>{item.role}</h3>
          <p className={styles.company}>{item.company}</p>
        </div>
        <span className={styles.period}>{item.period}</span>
      </header>
      {item.description &&
        item.description.map((paragraph, index) => (
          <p key={`${item.role}-description-${index}`} className={styles.description}>
            - {paragraph}
          </p>
        ))}
      <ul className={styles.skills}>
        {item.skills &&
          item.skills.map((skill) => (
            <li key={skill} className={styles.pill}>
              {skill}
            </li>
          ))}
      </ul>
    </article>
  )
}

export default ExperienceCard
