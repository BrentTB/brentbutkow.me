import { useState } from 'react'
import { Experience } from '../../../data/data.types'
import DetailCard from '../../../components/DetailCard'
import styles from './ExperienceCard.module.scss'

const PILLS_TO_SHOW = 6

function ExperienceCard({
  role,
  company,
  period,
  description,
  skills,
  experienceProjects,
}: Experience) {
  const [showProjects, setShowProjects] = useState(true)
  const hasProjects = experienceProjects && experienceProjects.length > 0

  return (
    <div className={styles.experienceWrapper}>
      <DetailCard
        title={role}
        subtitle={company}
        period={period}
        descriptions={description ?? []}
        pills={skills}
        pillsLimit={PILLS_TO_SHOW}
      >
        {hasProjects && (
          <button
            className={styles.toggleButton}
            onClick={() => setShowProjects(!showProjects)}
            aria-expanded={showProjects}
            aria-controls="experience-projects"
          >
            {showProjects ? '▼' : '▶'} {experienceProjects.length}{' '}
            {experienceProjects.length === 1 ? 'Project' : 'Projects'}
          </button>
        )}
      </DetailCard>

      {hasProjects && (
        <div
          className={`${styles.projectsContainer} ${showProjects ? styles.expanded : styles.collapsed}`}
        >
          {experienceProjects.map((project, index) => (
            <div key={`${project.company}-${index}`} className={styles.projectCard}>
              <DetailCard
                title={project.company}
                subtitle=""
                period={project.period}
                descriptions={project.description}
                pills={project.skills}
                pillsLimit={PILLS_TO_SHOW}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExperienceCard
