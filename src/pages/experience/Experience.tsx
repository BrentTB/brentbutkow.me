import ExperienceSection from '../home/components/ExperienceSection'
import styles from './Experience.module.css'
import { experience } from '../../data/data'

function Experience() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Professional Experience</h1>
        <p className={styles.subtitle}>
          A journey through roles, teams, and the technologies that drive meaningful products.
        </p>
      </div>
      <ExperienceSection entries={experience} />
    </main>
  )
}

export default Experience
