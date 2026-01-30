import { useMemo, useState } from 'react'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import Timeline from './components/Timeline'
import TimelineControls from './components/TimelineControls'
import { achievements } from '../achievements/data'
import { education } from '../education/data'
import { experience } from '../experience/data'
import {
  achievementToTimelineItem,
  educationToTimelineItem,
  experienceToTimelineItem,
  filterTimelineItems,
  sortTimelineItems,
} from './timeline.utils'
import { TimelineFilters } from './timeline.types'
import styles from './TimelinePage.module.scss'

function TimelinePage() {
  const [filters, setFilters] = useState<TimelineFilters>({
    experience: true,
    education: true,
    achievement: true,
  })

  const [startDateStr, setStartDateStr] = useState('')
  const [endDateStr, setEndDateStr] = useState('')

  const allTimelineItems = useMemo(() => {
    const experienceItems = experience.map((exp, idx) => experienceToTimelineItem(exp, idx))
    const educationItems = education.map((edu, idx) => educationToTimelineItem(edu, idx))
    const achievementItems = achievements.map((ach, idx) => achievementToTimelineItem(ach, idx))

    return sortTimelineItems([...experienceItems, ...educationItems, ...achievementItems])
  }, [])

  const filteredItems = useMemo(() => {
    const startDate = startDateStr ? new Date(startDateStr) : null
    const endDate = endDateStr ? new Date(endDateStr) : null

    return filterTimelineItems(allTimelineItems, filters, startDate, endDate)
  }, [allTimelineItems, filters, startDateStr, endDateStr])

  const handleFilterChange = (type: keyof TimelineFilters) => {
    setFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  const handleReset = () => {
    setFilters({
      experience: true,
      education: true,
      achievement: true,
    })
    setStartDateStr('')
    setEndDateStr('')
  }

  return (
    <PageLayout>
      <PageHeader
        title="Timeline"
        subtitle="A visual journey through my career, education, and achievements"
      />
      <div className={styles.container}>
        <TimelineControls
          filters={filters}
          onFilterChange={handleFilterChange}
          startDate={startDateStr}
          endDate={endDateStr}
          onStartDateChange={setStartDateStr}
          onEndDateChange={setEndDateStr}
          onReset={handleReset}
        />
        <Timeline items={filteredItems} />
      </div>
    </PageLayout>
  )
}

export default TimelinePage
