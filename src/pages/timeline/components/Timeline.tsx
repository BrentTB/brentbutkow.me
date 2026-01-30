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

  // Calculate timeline dimensions and positions
  const timelineData = useMemo(() => {
    if (items.length === 0) return null

    // Find the min and max dates
    let minDate = new Date()
    let maxDate = new Date(0)

    items.forEach((item) => {
      if (item.date < minDate) minDate = item.date
      const endDate = item.endDate || item.date
      if (endDate > maxDate) maxDate = endDate
    })

    // Add padding to the timeline (6 months before and after)
    const paddedMinDate = new Date(minDate)
    paddedMinDate.setMonth(paddedMinDate.getMonth() - 6)
    const paddedMaxDate = new Date(maxDate)
    paddedMaxDate.setMonth(paddedMaxDate.getMonth() + 6)

    // Calculate total months for scaling
    const totalMonths =
      (paddedMaxDate.getFullYear() - paddedMinDate.getFullYear()) * 12 +
      (paddedMaxDate.getMonth() - paddedMinDate.getMonth())

    // Scale: 80px per month for good visibility
    const pixelsPerMonth = 80
    const timelineWidth = totalMonths * pixelsPerMonth

    // Generate year markers
    const yearMarkers: { year: number; position: number }[] = []
    const startYear = paddedMinDate.getFullYear()
    const endYear = paddedMaxDate.getFullYear()

    for (let year = startYear; year <= endYear; year++) {
      const yearDate = new Date(year, 0, 1)
      const monthsFromStart =
        (yearDate.getFullYear() - paddedMinDate.getFullYear()) * 12 +
        (yearDate.getMonth() - paddedMinDate.getMonth())
      const position = monthsFromStart * pixelsPerMonth
      yearMarkers.push({ year, position })
    }

    // Calculate positions for items
    const calculatePosition = (date: Date): number => {
      const monthsFromStart =
        (date.getFullYear() - paddedMinDate.getFullYear()) * 12 +
        (date.getMonth() - paddedMinDate.getMonth())
      return monthsFromStart * pixelsPerMonth
    }

    const calculateWidth = (start: Date, end: Date | null): number => {
      const endDate = end || new Date()
      const months =
        (endDate.getFullYear() - start.getFullYear()) * 12 + (endDate.getMonth() - start.getMonth())
      return Math.max(months * pixelsPerMonth, pixelsPerMonth * 0.5) // Minimum width of half a month
    }

    // Separate items by type and position
    const experienceItems = items
      .filter((item) => item.type === 'experience')
      .map((item) => ({
        ...item,
        left: calculatePosition(item.date),
        width: calculateWidth(item.date, item.endDate),
      }))

    const educationItems = items
      .filter((item) => item.type === 'education')
      .map((item) => ({
        ...item,
        left: calculatePosition(item.date),
        width: calculateWidth(item.date, item.endDate),
      }))

    const achievementItems = items
      .filter((item) => item.type === 'achievement')
      .map((item) => ({
        ...item,
        left: calculatePosition(item.date),
        width: 0,
      }))

    return {
      timelineWidth,
      yearMarkers,
      experienceItems,
      educationItems,
      achievementItems,
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

  const { timelineWidth, yearMarkers, experienceItems, educationItems, achievementItems } =
    timelineData

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineScroll}>
        <div className={styles.timeline} style={{ width: `${timelineWidth}px` }}>
          {/* Experience items - above timeline */}
          <div className={styles.aboveTimeline}>
            <div className={styles.itemsLayer}>
              {experienceItems.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.timelineItem} ${styles.experienceItem}`}
                  style={{
                    left: `${item.left}px`,
                    width: `${item.width}px`,
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemSubtitle}>{item.subtitle}</div>
                    <div className={styles.itemDate}>
                      {formatDate(item.date)}
                      {item.endDate && ` - ${formatDate(item.endDate)}`}
                    </div>
                  </div>
                  <div className={styles.itemBar} />
                </div>
              ))}
            </div>

            {/* Education items - above timeline */}
            <div className={styles.itemsLayer}>
              {educationItems.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.timelineItem} ${styles.educationItem}`}
                  style={{
                    left: `${item.left}px`,
                    width: `${item.width}px`,
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemSubtitle}>{item.subtitle}</div>
                    <div className={styles.itemDate}>
                      {formatDate(item.date)}
                      {item.endDate && ` - ${formatDate(item.endDate)}`}
                    </div>
                  </div>
                  <div className={styles.itemBar} />
                </div>
              ))}
            </div>
          </div>

          {/* Main timeline axis */}
          <div className={styles.timelineAxis}>
            <div className={styles.timelineLine} />
            {yearMarkers.map((marker) => (
              <div
                key={marker.year}
                className={styles.yearMarker}
                style={{ left: `${marker.position}px` }}
              >
                <div className={styles.yearTick} />
                <div className={styles.yearLabel}>{marker.year}</div>
              </div>
            ))}
          </div>

          {/* Achievement items - below timeline */}
          <div className={styles.belowTimeline}>
            <div className={styles.itemsLayer}>
              {achievementItems.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.timelineItem} ${styles.achievementItem}`}
                  style={{
                    left: `${item.left}px`,
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  <div className={styles.achievementMarker} />
                  <div className={styles.itemContent}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemSubtitle}>{item.subtitle}</div>
                    <div className={styles.itemDate}>{formatDate(item.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Timeline
