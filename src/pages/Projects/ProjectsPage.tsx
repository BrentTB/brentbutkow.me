import { LabelledRow } from '../../components/cards/LabelledRow'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { projects } from './data'
import styles from './ProjectsPage.module.scss'

export function ProjectsPage() {
  return (
    <PageLayout>
      <PageHeader title="Projects" />
      <div className={styles.list}>
        {projects.map((project) => (
          <LabelledRow
            key={project.href}
            label={project.label}
            title={project.name}
            description={project.blurb}
            href={project.href}
            internal
          />
        ))}
      </div>
    </PageLayout>
  )
}
