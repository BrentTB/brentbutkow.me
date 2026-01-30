import { useNavigate } from 'react-router-dom'
import { TimelineItem } from '../timeline.types'
import styles from './Timeline.module.scss'

type TimelineProps = {
  items: TimelineItem[]
}

function Timeline({ items }: TimelineProps) {
  const navigate = useNavigate()

  const handleItemClick = (item: TimelineItem) => {
    navigate(`${item.targetPage}#${item.anchor}`)
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const calculateDuration = (start: Date, end: Date | null): string => {
    const endDate = end || new Date()
    const months = (endDate.getFullYear() - start.getFullYear()) * 12 + 
                   (endDate.getMonth() - start.getMonth())
    
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`
    }
    
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    
    if (remainingMonths === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`
    }
    
    return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No items match your current filters</p>
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineTrack}>
        <div className={styles.timelineLine} />
        {items.map((item, index) => {
          const isLeft = index % 2 === 0
          const markerClass =
            item.type === 'experience'
              ? styles.markerExperience
              : item.type === 'education'
                ? styles.markerEducation
                : styles.markerAchievement

          const durationClass =
            item.type === 'experience'
              ? styles.durationExperience
              : styles.durationEducation

          return (
            <div
              key={item.id}
              className={`${styles.timelineItem} ${isLeft ? styles.timelineItemLeft : styles.timelineItemRight}`}
              onClick={() => handleItemClick(item)}
            >
              <div className={styles.timelineContent}>
                <h3 className={styles.timelineTitle}>{item.title}</h3>
                {item.subtitle && <p className={styles.timelineSubtitle}>{item.subtitle}</p>}
                <div className={styles.timelineDate}>
                  {item.endDate ? (
                    <div className={styles.timelineDuration}>
                      <span>
                        {formatDate(item.date)} - {formatDate(item.endDate)}
                      </span>
                      <div
                        className={`${styles.durationBar} ${durationClass}`}
                        style={{
                          width: `${Math.min(calculateDuration(item.date, item.endDate).length * 3, 100)}px`,
                        }}
                      />
                      <span className={styles.durationText}>
                        ({calculateDuration(item.date, item.endDate)})
                      </span>
                    </div>
                  ) : (
                    formatDate(item.date)
                  )}
                </div>
              </div>
              <div className={`${styles.timelineMarker} ${markerClass}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Timeline
