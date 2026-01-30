import { TimelineFilters } from '../timeline.types'
import styles from './TimelineControls.module.scss'

type TimelineControlsProps = {
  filters: TimelineFilters
  onFilterChange: (type: keyof TimelineFilters) => void
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onReset: () => void
}

function TimelineControls({
  filters,
  onFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
}: TimelineControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.filterSection}>
        <label className={styles.filterLabel}>Filter by Type</label>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${styles.filterExperience} ${filters.experience ? styles.active : ''}`}
            onClick={() => onFilterChange('experience')}
          >
            <span className={`${styles.colorIndicator} ${styles.indicatorExperience}`} />
            Experience
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterEducation} ${filters.education ? styles.active : ''}`}
            onClick={() => onFilterChange('education')}
          >
            <span className={`${styles.colorIndicator} ${styles.indicatorEducation}`} />
            Education
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterAchievement} ${filters.achievement ? styles.active : ''}`}
            onClick={() => onFilterChange('achievement')}
          >
            <span className={`${styles.colorIndicator} ${styles.indicatorAchievement}`} />
            Achievements
          </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <label className={styles.filterLabel}>Date Range</label>
        <div className={styles.dateRangeSection}>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateLabel} htmlFor="start-date">
              From
            </label>
            <input
              id="start-date"
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateLabel} htmlFor="end-date">
              To
            </label>
            <input
              id="end-date"
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          <button className={styles.resetButton} onClick={onReset}>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export default TimelineControls
