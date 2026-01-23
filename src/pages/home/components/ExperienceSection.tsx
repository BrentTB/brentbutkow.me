import { Experience } from '../../../data/data.types'
import styles from './ExperienceSection.module.css'

type ExperienceSectionProps = {
  entries: Experience[]
}

function ExperienceSection({ entries }: ExperienceSectionProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Experience</p>
        <h2 className={styles.title}>Teams and roles</h2>
      </div>
      <div className={styles.list}>
        {entries.map((item) => (
          <article key={item.role} className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h3 className={styles.role}>{item.role}</h3>
                <p className={styles.company}>{item.company}</p>
              </div>
              <span className={styles.period}>{item.period}</span>
            </header>
            <p className={styles.summary}>{item.summary}</p>
            <ul className={styles.skills}>
              {item.skills.map((skill) => (
                <li key={skill} className={styles.pill}>
                  {skill}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

export default ExperienceSection
