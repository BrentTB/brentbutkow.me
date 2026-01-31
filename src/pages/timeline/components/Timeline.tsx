import { useMemo } from 'react'
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

  const formatPeriod = (start: Date, end: Date | null): string => {
    if (end) {
      return `${formatDate(start)} - ${formatDate(end)}`
    }
    return `${formatDate(start)} - Present`
  }

  // Group items by year (use the start year or achievement year)
  const timelineData = useMemo(() => {
    if (items.length === 0) return []

    // Group items by year
    const itemsByYear = new Map<number, TimelineItem[]>()
    
    items.forEach((item) => {
      const year = item.date.getFullYear()
      if (!itemsByYear.has(year)) {
        itemsByYear.set(year, [])
      }
      itemsByYear.get(year)!.push(item)
    })

    // Sort years in descending order (newest first)
    const sortedYears = Array.from(itemsByYear.keys()).sort((a, b) => b - a)
    
    return sortedYears.map(year => ({
      year,
      achievements: itemsByYear.get(year)!.filter(item => item.type === 'achievement'),
      experienceAndEducation: itemsByYear.get(year)!.filter(
        item => item.type === 'experience' || item.type === 'education'
      ),
    }))
  }, [items])

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No items match your current filters</p>
      </div>
    )
  }

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timeline}>
        {timelineData.map(({ year, achievements, experienceAndEducation }) => (
          <div key={year} className={styles.yearSection}>
            <div className={styles.yearRow}>
              {/* Left side - Achievements */}
              <div className={styles.leftSide}>
                {achievements.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.timelineItem} ${styles.achievementItem}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className={styles.itemContent}>
                      <h3 className={styles.itemTitle}>{item.title}</h3>
                      {item.subtitle && <p className={styles.itemSubtitle}>{item.subtitle}</p>}
                    </div>
                    <div className={styles.curlyBracket}>{'}'}</div>
                  </div>
                ))}
              </div>

              {/* Center - Year marker and line */}
              <div className={styles.centerLine}>
                <div className={styles.yearMarker}>{year}</div>
                <div className={styles.verticalLine} />
              </div>

              {/* Right side - Experience and Education */}
              <div className={styles.rightSide}>
                {experienceAndEducation.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.timelineItem} ${
                      item.type === 'experience' ? styles.experienceItem : styles.educationItem
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className={styles.curlyBracket}>{'{'}</div>
                    <div className={styles.itemContent}>
                      <h3 className={styles.itemTitle}>{item.title}</h3>
                      <p className={styles.itemSubtitle}>{item.subtitle}</p>
                      <p className={styles.itemDate}>{formatPeriod(item.date, item.endDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Timeline
