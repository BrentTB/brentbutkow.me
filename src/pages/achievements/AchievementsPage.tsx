import AchievementCard from './components/AchievementCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import styles from './AchievementsPage.module.scss'
import { achievements } from './data'
import { useMemo } from 'react'
import { useFunMode } from '../../contexts/FunMode'

function AchievementsPage() {
  const { isFunMode } = useFunMode()

  const { sortedYears, groupedByYear } = useMemo(() => {
    const filteredAchievements = achievements.filter((achievement) =>
      isFunMode ? true : !achievement.onlyShowInFunMode
    )

    const groupedByYear = filteredAchievements.reduce(
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

    return { sortedYears, groupedByYear }
  }, [isFunMode])

  return (
    <PageLayout>
      <PageHeader title="Achievements & Awards" />
      <div className={styles.container}>
        {sortedYears.map((year) => (
          <section key={year} className={styles.yearGroup}>
            <h2 className={styles.yearTitle}>{year}</h2>
            <div className={styles.achievementsList}>
              {groupedByYear[year].map((achievement) => (
                <AchievementCard key={`${year}-${achievement.title}`} achievement={achievement} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  )
}

export default AchievementsPage
