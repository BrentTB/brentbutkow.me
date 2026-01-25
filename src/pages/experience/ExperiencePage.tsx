import ExperienceCard from './components/ExperienceCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import styles from './ExperiencePage.module.scss'
import { experience } from './data'

function ExperiencePage() {
  return (
    <PageLayout>
      <PageHeader
        title="Professional Experience"
        subtitle="The places I have worked, the things I've done, and the skills I've built along the way."
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
