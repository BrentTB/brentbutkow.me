import EducationCard from './components/EducationCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import styles from './EducationPage.module.scss'
import { education } from './data'

function EducationPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Education & Learning"
        subtitle="Formal education and self-learning that I have completed, and am currently pursuing."
      />
      <div className={styles.list}>
        {education.map((item) => (
          <EducationCard key={`${item.institution}-${item.degree}`} {...item} />
        ))}
      </div>
    </PageLayout>
  )
}

export default EducationPage
