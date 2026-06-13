import { useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../components/utils/SafeLink'
import { useFunMode } from '../../contexts/useFunMode'
import { RecallFeed } from './components/RecallFeed'
import { RecallFilters } from './components/RecallFilters'
import { RecallTrendsChart } from './components/RecallTrendsChart'
import { StatCard } from './components/StatCard'
import { categoryLabels, recallRadarCopy, recallRadarLinks } from './data'
import { formatDate, formatNumber } from './chart-format'
import type { RecallCategory, RecallClass } from './recall.types'
import { useRecalls } from './useRecalls'
import { useRecallStats } from './useRecallStats'
import styles from './RecallRadar.module.scss'

export function RecallRadar() {
  const { isFunMode } = useFunMode()
  const [category, setCategory] = useState<RecallCategory | ''>('')
  const [classification, setClassification] = useState<RecallClass | ''>('')

  const stats = useRecallStats()
  const recalls = useRecalls({
    category: category || undefined,
    classification: classification || undefined,
    limit: 50,
  })

  const topCategory = stats.data?.byCategory.slice().sort((a, b) => b.count - a.count)[0]

  return (
    <PageLayout>
      <PageHeader title={recallRadarCopy.title} showBackButton />
      <p className={styles.intro}>{isFunMode ? recallRadarCopy.introFun : recallRadarCopy.intro}</p>

      {stats.data && (
        <div className={styles.stats}>
          <StatCard label="Recalls tracked" value={formatNumber(stats.data.total)} />
          {topCategory && (
            <StatCard
              label="Most common cause"
              value={categoryLabels[topCategory.category]}
              hint={`${formatNumber(topCategory.count)} recalls`}
            />
          )}
          <StatCard
            label="Last updated"
            value={stats.data.lastIngestAt ? formatDate(stats.data.lastIngestAt.slice(0, 10)) : '—'}
          />
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recalls per month</h2>
        {stats.loading && <p className={styles.status}>Loading trend…</p>}
        {stats.error && <p className={styles.status}>Couldn’t load trend data.</p>}
        {stats.data && <RecallTrendsChart data={stats.data.byMonth} />}
      </section>

      <section className={styles.section}>
        <div className={styles.feedHeader}>
          <h2 className={styles.sectionTitle}>Latest recalls</h2>
          <RecallFilters
            category={category}
            classification={classification}
            onCategoryChange={setCategory}
            onClassificationChange={setClassification}
          />
        </div>
        {recalls.loading && <p className={styles.status}>Loading recalls…</p>}
        {recalls.error && <p className={styles.status}>Couldn’t reach the recall service.</p>}
        {recalls.data && <RecallFeed recalls={recalls.data.items} />}
      </section>

      <footer className={styles.footer}>
        <p className={styles.methodology}>{recallRadarCopy.methodology}</p>
        <ul className={styles.links}>
          {recallRadarLinks.map((link) => (
            <li key={link.href}>
              <SafeLink href={link.href}>{link.label} ↗</SafeLink>
            </li>
          ))}
        </ul>
      </footer>
    </PageLayout>
  )
}
