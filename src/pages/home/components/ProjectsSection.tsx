import { Project } from '../../../data/data.types'
import { SafeLink } from '../../../utils/SafeLink'
import styles from './ProjectsSection.module.scss'

type ProjectsSectionProps = {
  projects: Project[]
}

function ProjectsSection({ projects }: ProjectsSectionProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Featured projects</p>
        <h2 className={styles.title}>Work that ships and scales</h2>
        <p className={styles.subtitle}>
          A selection of products and systems with a focus on clarity, resilience, and polish.
        </p>
      </div>
      <div className={styles.grid}>
        {projects.map((project) => (
          <article key={project.title} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{project.title}</h3>
              {project.status && <span className={styles.badge}>{project.status}</span>}
            </div>
            <p className={styles.description}>{project.description}</p>
            <div className={styles.meta}>
              <ul className={styles.stack}>
                {project.stack.map((tech) => (
                  <li key={tech} className={styles.pill}>
                    {tech}
                  </li>
                ))}
              </ul>
              {project.link && (
                <SafeLink className={styles.link} href={project.link}>
                  View details ↗
                </SafeLink>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default ProjectsSection
