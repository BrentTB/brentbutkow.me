import EducationCard from './components/EducationCard'
import PageLayout from '../../components/PageLayout'
import PageHeader from '../../components/PageHeader'
import styles from './EducationPage.module.scss'
import { education } from './data'

function EducationPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Education & Learning"
        subtitle="Formal training and ongoing self-directed learning that shapes my approach to problem-solving and engineering."
      />
      <div className={styles.list}>
        {education.map((item) => (
          <EducationCard key={`${item.institution}-${item.degree}`} item={item} />
        ))}
      </div>
    </PageLayout>
  )
}

export default EducationPage
