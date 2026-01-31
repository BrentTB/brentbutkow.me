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
            aria-pressed={filters.experience}
            aria-label="Filter by experience"
          >
            <span className={`${styles.colorIndicator} ${styles.indicatorExperience}`} />
            Experience
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterEducation} ${filters.education ? styles.active : ''}`}
            onClick={() => onFilterChange('education')}
            aria-pressed={filters.education}
            aria-label="Filter by education"
          >
            <span className={`${styles.colorIndicator} ${styles.indicatorEducation}`} />
            Education
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterAchievement} ${filters.achievement ? styles.active : ''}`}
            onClick={() => onFilterChange('achievement')}
            aria-pressed={filters.achievement}
            aria-label="Filter by achievements"
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
            <label className={styles.dateLabel} htmlFor="start-year">
              From
            </label>
            <input
              id="start-year"
              type="number"
              className={styles.dateInput}
              placeholder="Year"
              min="2000"
              max="2030"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateLabel} htmlFor="end-year">
              To
            </label>
            <input
              id="end-year"
              type="number"
              className={styles.dateInput}
              placeholder="Year"
              min="2000"
              max="2030"
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
