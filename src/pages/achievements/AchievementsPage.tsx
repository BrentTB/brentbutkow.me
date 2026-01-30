import AchievementCard from './components/AchievementCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import styles from './AchievementsPage.module.scss'
import { achievements } from './data'
import { useMemo } from 'react'
import { useFunMode } from '../../contexts/FunMode'
import { Achievement } from '../../data/data.types'

function AchievementsPage() {
  const { isFunMode } = useFunMode()

  const { sortedYears, groupedByYear, achievementIndexMap } = useMemo(() => {
    const filteredAchievements = achievements.filter((achievement) =>
      isFunMode ? true : !achievement.onlyShowInFunMode
    )

    // Create a map to track the original index of each achievement
    const achievementIndexMap = new Map<Achievement, number>()
    achievements.forEach((ach, idx) => {
      achievementIndexMap.set(ach, idx)
    })

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

    return { sortedYears, groupedByYear, achievementIndexMap }
  }, [isFunMode])

  return (
    <PageLayout>
      <PageHeader
        title="Achievements & Awards"
        subtitle="Work-related and personal achievements and awards."
      />
      <div className={styles.container}>
        {sortedYears.map((year) => (
          <section key={year} className={styles.yearGroup}>
            <h2 className={styles.yearTitle}>{year}</h2>
            <div className={styles.achievementsList}>
              {groupedByYear[year].map((achievement) => {
                const idx = achievementIndexMap.get(achievement) ?? 0
                return (
                  <AchievementCard
                    key={`${year}-${achievement.title}`}
                    achievement={achievement}
                    id={`achievement-${idx}`}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  )
}

export default AchievementsPage
