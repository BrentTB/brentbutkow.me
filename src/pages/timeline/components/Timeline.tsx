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

  // Calculate timeline with proper scaling
  const timelineData = useMemo(() => {
    if (items.length === 0) return null

    // Find min and max dates for the timeline
    let minDate = new Date()
    let maxDate = new Date(0)

    items.forEach((item) => {
      if (item.date < minDate) minDate = item.date
      const endDate = item.endDate || new Date()
      if (endDate > maxDate) maxDate = endDate
    })

    // Add padding (6 months before and after)
    const paddedMinDate = new Date(minDate)
    paddedMinDate.setMonth(paddedMinDate.getMonth() - 6)
    const paddedMaxDate = new Date(maxDate)
    paddedMaxDate.setMonth(paddedMaxDate.getMonth() + 6)

    // Calculate total months for the timeline
    const totalMonths =
      (paddedMaxDate.getFullYear() - paddedMinDate.getFullYear()) * 12 +
      (paddedMaxDate.getMonth() - paddedMinDate.getMonth())

    // Scale: 60px per month (vertical scale)
    const pixelsPerMonth = 60

    // Function to calculate position from top (in pixels)
    const calculatePosition = (date: Date): number => {
      const monthsFromStart =
        (date.getFullYear() - paddedMinDate.getFullYear()) * 12 +
        (date.getMonth() - paddedMinDate.getMonth())
      return monthsFromStart * pixelsPerMonth
    }

    // Function to calculate height for duration items
    const calculateHeight = (start: Date, end: Date | null): number => {
      const endDate = end || new Date()
      const months =
        (endDate.getFullYear() - start.getFullYear()) * 12 + (endDate.getMonth() - start.getMonth())
      return Math.max(months * pixelsPerMonth, pixelsPerMonth * 0.5) // Minimum half a month
    }

    // Generate year markers
    const yearMarkers: { year: number; position: number }[] = []
    const startYear = paddedMinDate.getFullYear()
    const endYear = paddedMaxDate.getFullYear()

    for (let year = startYear; year <= endYear; year++) {
      const yearDate = new Date(year, 0, 1)
      const position = calculatePosition(yearDate)
      yearMarkers.push({ year, position })
    }

    // Process items with positions
    const processedItems = items.map((item) => ({
      ...item,
      top: calculatePosition(item.date),
      height: item.endDate ? calculateHeight(item.date, item.endDate) : 0,
    }))

    const timelineHeight = totalMonths * pixelsPerMonth

    return {
      processedItems,
      yearMarkers,
      timelineHeight,
      achievements: processedItems.filter((item) => item.type === 'achievement'),
      experienceAndEducation: processedItems.filter(
        (item) => item.type === 'experience' || item.type === 'education'
      ),
    }
  }, [items])

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No items match your current filters</p>
      </div>
    )
  }

  if (!timelineData) return null

  const { achievements, experienceAndEducation, yearMarkers, timelineHeight } = timelineData

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timeline} style={{ height: `${timelineHeight}px` }}>
        {/* Left side - Achievements */}
        <div className={styles.leftSide}>
          {achievements.map((item) => (
            <div
              key={item.id}
              className={`${styles.timelineItem} ${styles.achievementItem}`}
              style={{
                top: `${item.top}px`,
              }}
              onClick={() => handleItemClick(item)}
            >
              <div className={styles.itemContent}>
                <h3 className={styles.itemTitle}>{item.title}</h3>
                {item.subtitle && <p className={styles.itemSubtitle}>{item.subtitle}</p>}
              </div>
              <div className={styles.achievementLine} />
            </div>
          ))}
        </div>

        {/* Center - Vertical timeline with year markers */}
        <div className={styles.centerLine}>
          <div className={styles.verticalLine} style={{ height: `${timelineHeight}px` }} />
          {yearMarkers.map((marker) => (
            <div
              key={marker.year}
              className={styles.yearMarker}
              style={{ top: `${marker.position}px` }}
            >
              {marker.year}
            </div>
          ))}
        </div>

        {/* Right side - Experience and Education */}
        <div className={styles.rightSide}>
          {experienceAndEducation.map((item) => (
            <div
              key={item.id}
              className={`${styles.timelineItem} ${
                item.type === 'experience' ? styles.experienceItem : styles.educationItem
              }`}
              style={{
                top: `${item.top}px`,
                height: `${item.height}px`,
              }}
              onClick={() => handleItemClick(item)}
            >
              <svg
                className={styles.scalingBracket}
                viewBox="0 0 30 100"
                preserveAspectRatio="none"
                style={{ height: `${item.height}px` }}
              >
                <path
                  d="M 30 0 Q 10 0, 10 10 L 10 90 Q 10 100, 30 100"
                  fill="none"
                  strokeWidth="2"
                />
              </svg>
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
  )
}

export default Timeline
