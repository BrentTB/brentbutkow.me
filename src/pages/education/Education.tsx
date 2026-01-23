import EducationCard from './EducationCard'
import styles from './Education.module.css'
import { education } from '../../data/data'

function Education() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Education & Learning</h1>
        <p className={styles.subtitle}>
          Formal training and ongoing self-directed learning that shapes my approach to
          problem-solving and engineering.
        </p>
      </div>
      <div className={styles.list}>
        {education.map((item, index) => (
          <EducationCard key={index} item={item} />
        ))}
      </div>
    </main>
  )
}

export default Education
