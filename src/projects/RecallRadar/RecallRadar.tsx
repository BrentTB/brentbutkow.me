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
import { Select, type SelectOption } from '../../components/inputs/Select'
import { categoryLabels, recallRadarCopy, recallRadarLinks, trendGroupLabels } from './data'
import { deriveYears, formatDate, formatNumber, ingestFreshness } from './chart-format'
import { anomalyCallouts, deriveCallouts } from './trend-callouts'
import { toChartMonths } from './trend-chart'
import { RecallCountry, TrendGroup, isTrendGroup, type RecallFilterValues } from './recall.types'
import { useRecalls } from './useRecalls'
import { useRecallStats } from './useRecallStats'
import { useRecallTrend } from './useRecallTrend'
import styles from './RecallRadar.module.scss'

const EMPTY_FILTERS: RecallFilterValues = {
  category: '',
  classification: '',
  state: '',
  company: '',
  source: '',
  entity: '',
  search: '',
}

export function RecallRadar() {
  const { isFunMode } = useFunMode()
  const [country, setCountry] = useState<RecallCountry>(RecallCountry.us)
  const [filters, setFilters] = useState<RecallFilterValues>(EMPTY_FILTERS)
  const [year, setYear] = useState<number | null>(null)
  const [group, setGroup] = useState<TrendGroup>(TrendGroup.category)
  const debouncedSearch = useDebouncedValue(filters.search, 500)

  // Switching country is a fresh view — reset filters + year so US selections don't leak into UK.
  const changeCountry = (next: RecallCountry) => {
    setCountry(next)
    setFilters(EMPTY_FILTERS)
    setYear(null)
  }

  const stats = useRecallStats(country)
  const trend = useRecallTrend(country, group)
  const recalls = useRecalls({
    country,
    category: filters.category || undefined,
    classification: filters.classification || undefined,
    state: filters.state || undefined,
    company: filters.company || undefined,
    source: filters.source || undefined,
    entity: filters.entity || undefined,
    search: debouncedSearch.trim() || undefined,
    limit: 50,
  })

  const patch = (next: Partial<RecallFilterValues>) =>
    setFilters((current) => ({ ...current, ...next }))

  const years = stats.data ? deriveYears(stats.data.byMonth) : []
  // Clamp to an available year — a stale `year` from a prior dataset would orphan the <select>.
  const fallbackYear = years[0] ?? new Date().getFullYear()
  const selectedYear = year !== null && years.includes(year) ? year : fallbackYear
  const chart = trend.data ? toChartMonths(trend.data, selectedYear) : { months: [], legend: [] }
  // Source grouping is intentionally omitted for now — only Total + By cause are offered.
  const groupOptions: SelectOption[] = [TrendGroup.total, TrendGroup.category].map((value) => ({
    value,
    label: trendGroupLabels[value],
  }))
  const freshness = stats.data ? ingestFreshness(stats.data.lastIngestAt, new Date()) : null

  const topCategory = stats.data?.byCategory.slice().sort((a, b) => b.count - a.count)[0]
  const topState = stats.data?.byState[0]
  const stateOptions = stats.data?.byState.map((entry) => entry.label) ?? []
  const companyOptions = stats.data?.byCompany.map((entry) => entry.label) ?? []
  // Backend-detected anomalies lead (they're the ML headline), then the descriptive summaries.
  const callouts = stats.data
    ? [...anomalyCallouts(stats.data.anomalies), ...deriveCallouts(stats.data)]
    : []

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
          <div className={styles.controls}>
            <Select
              ariaLabel="Group by"
              value={group}
              options={groupOptions}
              onChange={(value) => setGroup(isTrendGroup(value) ? value : TrendGroup.total)}
            />
            {years.length > 0 && (
              <Select
                ariaLabel="Year"
                value={String(selectedYear)}
                options={years.map((value) => ({ value: String(value), label: String(value) }))}
                onChange={(value) => setYear(Number(value))}
              />
            )}
          </div>
        </div>
        {trend.loading && <p className={styles.status}>Loading trend…</p>}
        {trend.error && <p className={styles.status}>Couldn’t load trend data.</p>}
        {trend.data && (
          <RecallTrendsChart data={chart.months} year={selectedYear} legend={chart.legend} />
        )}
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

      <div id="tech-stack">
        <ProjectOverview />
      </div>

      <footer className={styles.footer}>
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
