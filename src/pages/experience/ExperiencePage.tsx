import ExperienceCard from './components/ExperienceCard'
import PageLayout from '../../components/PageLayout'
import PageHeader from '../../components/PageHeader'
import styles from './ExperiencePage.module.scss'
import { experience } from './data'

function ExperiencePage() {
  return (
    <PageLayout>
      <PageHeader
        title="Professional Experience"
        subtitle="A journey through roles, teams, and the technologies that drive meaningful products."
      />
      <div className={styles.list}>
        {experience.map((item, index) => (
          <ExperienceCard key={`${item.role}-${index}`} {...item} />
        ))}
      </div>
    </PageLayout>
  )
}

export default ExperiencePage
