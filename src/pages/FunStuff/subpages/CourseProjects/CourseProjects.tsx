import { ArticleOrLinkCard } from '../../../../components/cards/ArticleOrLinkCard'
import { PageHeader } from '../../../../components/PageFormatting/PageHeader'
import { PageLayout } from '../../../../components/PageFormatting/PageLayout'
import { courseProjects } from './data'
import styles from './CourseProjects.module.scss'

export function CourseProjects() {
  return (
    <PageLayout>
      <PageHeader title="Course Projects" />
      <div className={styles.container}>
        {courseProjects.map((project) => (
          <ArticleOrLinkCard key={project.title} href={project.link}>
            <h4 className={styles.title}>{project.title}</h4>
            <p className={styles.description}>{project.description}</p>
          </ArticleOrLinkCard>
        ))}
      </div>
    </PageLayout>
  )
}
