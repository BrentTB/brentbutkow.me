import { Education } from '../../data/data.types'
import styles from './EducationCard.module.css'

type EducationCardProps = {
  item: Education
}

function EducationCard({ item }: EducationCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.degree}>{item.degree}</h3>
          <p className={styles.field}>{item.field}</p>
          <p className={styles.institution}>{item.institution}</p>
        </div>
        <span className={styles.period}>{item.period}</span>
      </header>
      <p className={styles.description}>{item.description}</p>
      {item.achievements && item.achievements.length > 0 && (
        <ul className={styles.achievements}>
          {item.achievements.map((achievement) => (
            <li key={achievement} className={styles.achievement}>
              {achievement}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default EducationCard
