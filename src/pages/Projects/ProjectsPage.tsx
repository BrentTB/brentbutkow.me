import { ArticleOrLinkCard } from '../../components/cards/ArticleOrLinkCard'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { CommandLine } from '../../components/PageFormatting/CommandLine'
import { projects } from './data'
import styles from './ProjectsPage.module.scss'

export function ProjectsPage() {
  return (
    <PageLayout>
      <PageHeader title="Projects" />
      <CommandLine />
      <div className={styles.list}>
        {projects.map((project) => (
          <ArticleOrLinkCard key={project.href} href={project.href} internal>
            <div className={styles.row}>
              <span className={styles.name}>{project.name}</span>
              <span className={styles.blurb}>{project.blurb}</span>
            </div>
          </ArticleOrLinkCard>
        ))}
      </div>
    </PageLayout>
  )
}
