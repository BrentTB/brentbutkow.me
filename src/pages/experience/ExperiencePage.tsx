import ExperienceCard from './components/ExperienceCard'
import styles from './ExperiencePage.module.css'
import { experience } from '../../data/data'

function ExperiencePage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Professional Experience</h1>
        <p className={styles.subtitle}>
          A journey through roles, teams, and the technologies that drive meaningful products.
        </p>
      </div>
      <div className={styles.list}>
        {experience.map((item, index) => (
          <ExperienceCard key={`${item.role}-${index}`} item={item} />
        ))}
      </div>
    </main>
  )
}

export default ExperiencePage
