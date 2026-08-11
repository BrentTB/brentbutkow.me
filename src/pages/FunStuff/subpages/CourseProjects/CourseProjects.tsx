import { PageHeader } from '../../../../components/PageFormatting/PageHeader'
import { PageLayout } from '../../../../components/PageFormatting/PageLayout'
import { FunCard } from '../../components/FunCard'
import { courseProjects } from './data'
import styles from './CourseProjects.module.scss'

export function CourseProjects() {
  return (
    <PageLayout>
      <PageHeader title="Course Projects" />
      <div className={styles.container}>
        {courseProjects.map((project) => (
          <FunCard key={`${project.title}-${project.link ?? ''}`} item={project} />
        ))}
      </div>
    </PageLayout>
  )
}
