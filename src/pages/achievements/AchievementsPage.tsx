import AchievementCard from './components/AchievementCard'
import PageLayout from '../../components/PageLayout'
import PageHeader from '../../components/PageHeader'
import styles from './AchievementsPage.module.scss'
import { achievements } from '../../data/data'

function AchievementsPage() {
  // Group achievements by year and sort by year descending
  const groupedByYear = achievements.reduce(
    (acc, achievement) => {
      const year = achievement.year
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(achievement)
      return acc
    },
    {} as Record<number, typeof achievements>
  )

  const sortedYears = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <PageLayout>
      <PageHeader
        title="Achievements & Awards"
        subtitle="Milestones and recognition that mark my journey as an engineer and professional."
      />
      <div className={styles.container}>
        {sortedYears.map((year) => (
          <section key={year} className={styles.yearGroup}>
            <h2 className={styles.yearTitle}>{year}</h2>
            <div className={styles.achievementsList}>
              {groupedByYear[year].map((item) => (
                <AchievementCard key={`${year}-${item.title}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  )
}

export default AchievementsPage
