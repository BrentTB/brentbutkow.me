import { useState } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../components/utils/SafeLink'
import { getLinkArrow } from '../../components/utils/link-arrow'
import { useFunMode } from '../../contexts/useFunMode'
import { useDebouncedValue } from '../../api/useDebouncedValue'
import { Breakdowns } from './components/Breakdowns'
import { CountrySelector } from './components/CountrySelector'
import { ProjectOverview } from './components/ProjectOverview'
import { RecallFeed } from './components/RecallFeed'
import { RecallFilters } from './components/RecallFilters'
import { RecallMap } from './components/RecallMap'
import { RecallTrendsChart } from './components/RecallTrendsChart'
import { StatCard } from './components/StatCard'
import { TrendCallouts } from './components/TrendCallouts'
import { categoryLabels, methodologyPoints, recallRadarCopy, recallRadarLinks } from './data'
import {
  deriveYears,
  formatDate,
  formatNumber,
  ingestFreshness,
  monthsForYear,
} from './chart-format'
import { deriveCallouts } from './trend-callouts'
import { RecallCountry, type RecallFilterValues } from './recall.types'
import { useRecalls } from './useRecalls'
import { useRecallStats } from './useRecallStats'
import styles from './RecallRadar.module.scss'

const EMPTY_FILTERS: RecallFilterValues = {
  category: '',
  classification: '',
  state: '',
  company: '',
  source: '',
  search: '',
}

export function RecallRadar() {
  const { isFunMode } = useFunMode()
  const [country, setCountry] = useState<RecallCountry>(RecallCountry.us)
  const [filters, setFilters] = useState<RecallFilterValues>(EMPTY_FILTERS)
  const [year, setYear] = useState<number | null>(null)
  const debouncedSearch = useDebouncedValue(filters.search, 500)

  // Switching country is a fresh view — reset filters + year so US selections don't leak into UK.
  const changeCountry = (next: RecallCountry) => {
    setCountry(next)
    setFilters(EMPTY_FILTERS)
    setYear(null)
  }

  const stats = useRecallStats(country)
  const recalls = useRecalls({
    country,
    category: filters.category || undefined,
    classification: filters.classification || undefined,
    state: filters.state || undefined,
    company: filters.company || undefined,
    source: filters.source || undefined,
    search: debouncedSearch.trim() || undefined,
    limit: 50,
  })

  const patch = (next: Partial<RecallFilterValues>) =>
    setFilters((current) => ({ ...current, ...next }))

  const years = stats.data ? deriveYears(stats.data.byMonth) : []
  // Clamp to an available year — a stale `year` from a prior dataset would orphan the <select>.
  const fallbackYear = years[0] ?? new Date().getFullYear()
  const selectedYear = year !== null && years.includes(year) ? year : fallbackYear
  const monthSeries = stats.data ? monthsForYear(stats.data.byMonth, selectedYear) : []
  const freshness = stats.data ? ingestFreshness(stats.data.lastIngestAt, new Date()) : null

  const topCategory = stats.data?.byCategory.slice().sort((a, b) => b.count - a.count)[0]
  const topState = stats.data?.byState[0]
  const stateOptions = stats.data?.byState.map((entry) => entry.label) ?? []
  const companyOptions = stats.data?.byCompany.map((entry) => entry.label) ?? []
  const callouts = stats.data ? deriveCallouts(stats.data) : []

  return (
    <PageLayout>
      <PageHeader title={recallRadarCopy.title} showBackButton />
      <p className={styles.intro}>{isFunMode ? recallRadarCopy.introFun : recallRadarCopy.intro}</p>

      <div className={styles.topBar}>
        <CountrySelector value={country} onChange={changeCountry} />
        {freshness && (
          <span className={`${styles.freshness} ${freshness.stale ? styles.stale : ''}`}>
            {freshness.label}
          </span>
        )}
        <button
          type="button"
          className={styles.techStackLink}
          onClick={() =>
            document.getElementById('tech-stack')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          {recallRadarCopy.techStackPrompt}
        </button>
      </div>

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
          {topState && (
            <StatCard
              label="Top state"
              value={topState.label}
              hint={`${formatNumber(topState.count)} recalls`}
            />
          )}
          <StatCard
            label="Last updated"
            value={stats.data.lastIngestAt ? formatDate(stats.data.lastIngestAt.slice(0, 10)) : '—'}
          />
        </div>
      )}

      <TrendCallouts callouts={callouts} />

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Recalls per month</h2>
          {years.length > 0 && (
            <label className={styles.yearSelect}>
              <span className={styles.srOnly}>Year</span>
              <select
                value={selectedYear}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {stats.loading && <p className={styles.status}>Loading trend…</p>}
        {stats.error && <p className={styles.status}>Couldn’t load trend data.</p>}
        {stats.data && <RecallTrendsChart data={monthSeries} year={selectedYear} />}
      </section>

      {stats.data && country === RecallCountry.us && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{recallRadarCopy.stateMapTitle}</h2>
          <p className={styles.hint}>Click a state to filter the recalls below.</p>
          <RecallMap
            byState={stats.data.byState}
            activeState={filters.state}
            onSelect={(state) => patch({ state })}
          />
        </section>
      )}

      {stats.data && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Breakdowns</h2>
          <p className={styles.hint}>Click any row to filter the recalls below.</p>
          <Breakdowns stats={stats.data} filters={filters} onSelect={patch} />
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Recalls{recalls.data ? ` (${formatNumber(recalls.data.total)})` : ''}
        </h2>
        <RecallFilters
          filters={filters}
          country={country}
          stateOptions={stateOptions}
          companyOptions={companyOptions}
          onChange={patch}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />
        {recalls.loading && <p className={styles.status}>Loading recalls…</p>}
        {recalls.error && <p className={styles.status}>Couldn’t reach the recall service.</p>}
        {recalls.data && <RecallFeed recalls={recalls.data.items} />}
      </section>

      <section className={styles.section}>
        <details className={styles.methodologyDetails}>
          <summary>How this works</summary>
          <ul>
            {methodologyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </details>
      </section>

      <div id="tech-stack">
        <ProjectOverview />
      </div>

      <footer className={styles.footer}>
        <p className={styles.methodology}>{recallRadarCopy.methodology}</p>
        <ul className={styles.links}>
          {recallRadarLinks.map((link) => (
            <li key={link.href}>
              <SafeLink href={link.href}>
                {link.label} {getLinkArrow(false)}
              </SafeLink>
            </li>
          ))}
        </ul>
      </footer>
    </PageLayout>
  )
}
