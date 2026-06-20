import { useMemo } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../components/utils/SafeLink'
import { getLinkArrow } from '../../components/utils/link-arrow'
import { useFunMode } from '../../contexts/useFunMode'
import { useDebouncedValue } from '../../api/useDebouncedValue'
import { Breakdowns } from './components/Breakdowns'
import { CountrySelector } from './components/CountrySelector'
import { Pagination } from './components/Pagination'
import { ProjectOverview } from './components/ProjectOverview'
import { RecallFeed } from './components/RecallFeed'
import { RecallFilters } from './components/RecallFilters'
import { RecallMap } from './components/RecallMap'
import { RecallTrendsChart } from './components/RecallTrendsChart'
import { SeverityBar } from './components/SeverityBar'
import { StatCard } from './components/StatCard'
import { TrendCallouts } from './components/TrendCallouts'
import { Themes } from './components/Themes'
import { Select } from '../../components/inputs/Select'
import type { SelectOption } from '../../components/inputs/option.types'
import {
  categoryLabels,
  recallRadarCopy,
  recallRadarLinks,
  sortLabels,
  trendGroupLabels,
} from './data'
import { deriveYears, formatDate, formatNumber, ingestFreshness } from './chart-format'
import { anomalyCallouts, deriveCallouts } from './trend-callouts'
import { toChartMonths } from './trend-chart'
import {
  RecallCountry,
  RecallSort,
  TrendGroup,
  isRecallCategory,
  isRecallClass,
  isRecallCountry,
  isRecallSort,
  isRecallSource,
  isSeverityLabel,
  isTrendGroup,
  isIsoDate,
  type RecallFilterValues,
  type TopicOut,
} from './recall.types'
import { useQueryParamsState } from '../../routes/useQueryParamsState'
import { useRecalls } from './useRecalls'
import { useRecallStats } from './useRecallStats'
import { useRecallTrend } from './useRecallTrend'
import { useTopics } from './useTopics'
import styles from './RecallRadar.module.scss'

const EMPTY_FILTERS: RecallFilterValues = {
  category: '',
  classification: '',
  severity: '',
  topic: '',
  state: '',
  company: '',
  source: '',
  entity: '',
  search: '',
  since: '',
  until: '',
}

// The URL is the source of truth for the whole view. Param name → default; absent/default params
// stay out of the query string. Stable module-level object so the hook's memo doesn't churn.
const DEFAULT_PARAMS = {
  ...EMPTY_FILTERS,
  location: RecallCountry.us,
  group: TrendGroup.category,
  sort: RecallSort.recency,
  year: '',
  page: '',
}

// The recall feed paginates this many rows at a time.
const PAGE_SIZE = 20

export function RecallRadar() {
  const { isFunMode } = useFunMode()
  const { values, patch: patchParams } = useQueryParamsState(DEFAULT_PARAMS)

  // URL strings → typed UI state, validated rather than cast (query params are untrusted input).
  const country = isRecallCountry(values.location) ? values.location : RecallCountry.us
  const group = isTrendGroup(values.group) ? values.group : TrendGroup.category
  const sort = isRecallSort(values.sort) ? values.sort : RecallSort.recency
  const year = values.year ? Number(values.year) : null
  const filters: RecallFilterValues = {
    category: isRecallCategory(values.category) ? values.category : '',
    classification: isRecallClass(values.classification) ? values.classification : '',
    severity: isSeverityLabel(values.severity) ? values.severity : '',
    // Topic is a slug in the URL (lowercase, digits, hyphens); guard junk so a bad ?topic= can't
    // reach the API.
    topic: /^[a-z0-9-]+$/.test(values.topic) ? values.topic : '',
    state: values.state,
    company: values.company,
    source: isRecallSource(values.source) ? values.source : '',
    entity: values.entity,
    search: values.search,
    since: isIsoDate(values.since) ? values.since : '',
    until: isIsoDate(values.until) ? values.until : '',
  }
  const debouncedSearch = useDebouncedValue(filters.search, 500)

  // Any filter change resets to page 1; the pager sets `page` directly (goToPage).
  const patch = (next: Partial<RecallFilterValues>) => patchParams({ ...next, page: '' })
  const clearFilters = () => patchParams({ ...EMPTY_FILTERS, page: '' })
  // Switching country is a fresh view — reset filters + year so US selections don't leak into UK.
  const changeCountry = (next: RecallCountry) =>
    patchParams({ location: next, ...EMPTY_FILTERS, year: '', page: '' })
  const page = Math.max(1, Number(values.page) || 1)
  const goToPage = (next: number) => patchParams({ page: next <= 1 ? '' : String(next) })

  // One filter set drives both the chart and the list, so they always describe the same recalls.
  // Stats (breakdowns, map, callouts) stay country-only — a global overview that also picks filters.
  const queryFilters = {
    country,
    category: filters.category || undefined,
    classification: filters.classification || undefined,
    severity: filters.severity || undefined,
    topic: filters.topic || undefined,
    state: filters.state || undefined,
    company: filters.company || undefined,
    source: filters.source || undefined,
    entity: filters.entity || undefined,
    search: debouncedSearch.trim() || undefined,
    since: filters.since || undefined,
    until: filters.until || undefined,
  }
  const stats = useRecallStats(country)
  const trend = useRecallTrend(queryFilters, group)
  const recalls = useRecalls({
    ...queryFilters,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort: sort === RecallSort.recency ? undefined : sort,
  })
  // Themes are per-country; refetches on country change. The id→topic map lets the per-card chip
  // show a recall's theme and filter by its slug; the active-topic chip resolves the slug → label.
  const topics = useTopics(country)
  const topicsById = useMemo(
    () => new Map(topics.data?.map((topic): [number, TopicOut] => [topic.id, topic]) ?? []),
    [topics.data]
  )
  const activeTopicLabel = filters.topic
    ? topics.data?.find((topic) => topic.slug === filters.topic)?.label
    : undefined

  // Year options follow the data, then narrow to whatever the date filter admits (2021–2025 for a
  // 2021-01-05 → 2025-02-03 range), so the chart can't offer a year the filters exclude.
  const sinceYear = filters.since ? Number(filters.since.slice(0, 4)) : -Infinity
  const untilYear = filters.until ? Number(filters.until.slice(0, 4)) : Infinity
  const years = (stats.data ? deriveYears(stats.data.byMonth) : []).filter(
    (y) => y >= sinceYear && y <= untilYear
  )
  // Clamp to an available year — a stale `year` from a prior dataset would orphan the <select>.
  const fallbackYear = years[0] ?? new Date().getFullYear()
  const selectedYear = year !== null && years.includes(year) ? year : fallbackYear
  const chart = trend.data ? toChartMonths(trend.data, selectedYear) : { months: [], legend: [] }
  // Source grouping is intentionally omitted for now — only Total + By cause are offered.
  const groupOptions: SelectOption[] = [TrendGroup.total, TrendGroup.category].map((value) => ({
    value,
    label: trendGroupLabels[value],
  }))
  const sortOptions: SelectOption[] = [RecallSort.recency, RecallSort.severity].map((value) => ({
    value,
    label: sortLabels[value],
  }))
  const freshness = stats.data ? ingestFreshness(stats.data.lastIngestAt, new Date()) : null

  const topCategory = stats.data?.byCategory.slice().sort((a, b) => b.count - a.count)[0]
  const topState = stats.data?.byState[0]
  const stateOptions = stats.data?.byState.map((entry) => entry.label) ?? []
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
        <>
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
              value={
                stats.data.lastIngestAt ? formatDate(stats.data.lastIngestAt.slice(0, 10)) : '—'
              }
            />
          </div>
          <SeverityBar data={stats.data.bySeverity} />
        </>
      )}

      <TrendCallouts callouts={callouts} />

      <RecallFilters
        filters={filters}
        country={country}
        stateOptions={stateOptions}
        topicLabel={activeTopicLabel}
        onChange={patch}
        onClear={clearFilters}
      />
      <p className={styles.hint}>Filters apply to the chart and the recall list below.</p>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Recalls per month</h2>
          <div className={styles.controls}>
            <Select
              ariaLabel="Group by"
              value={group}
              options={groupOptions}
              onChange={(value) =>
                patchParams({ group: isTrendGroup(value) ? value : TrendGroup.total })
              }
            />
            {years.length > 0 && (
              <Select
                ariaLabel="Year"
                value={String(selectedYear)}
                options={years.map((value) => ({ value: String(value), label: String(value) }))}
                // Year's real default is the dynamic fallback (latest year), not '', so clear the
                // param when it's reselected — keeps the default view's URL clean like every other.
                onChange={(value) =>
                  patchParams({ year: Number(value) === fallbackYear ? '' : value })
                }
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

      {topics.data && topics.data.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Themes</h2>
          <p className={styles.hint}>
            Auto-discovered topics across recall text. Click one to filter the recalls below.
          </p>
          <Themes
            topics={topics.data}
            activeTopic={filters.topic}
            onSelect={(slug) => patch({ topic: slug })}
          />
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            Recalls{recalls.data ? ` (${formatNumber(recalls.data.total)})` : ''}
          </h2>
          <div className={styles.controls}>
            <Select
              ariaLabel="Sort recalls"
              value={sort}
              options={sortOptions}
              onChange={(value) =>
                patchParams({ sort: isRecallSort(value) ? value : RecallSort.recency, page: '' })
              }
            />
          </div>
        </div>
        {recalls.loading && <p className={styles.status}>Loading recalls…</p>}
        {recalls.error && <p className={styles.status}>Couldn’t reach the recall service.</p>}
        {recalls.data && (
          <RecallFeed
            recalls={recalls.data.items}
            topicsById={topicsById}
            onTopicSelect={(slug) => patch({ topic: slug })}
          />
        )}
        {recalls.data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={recalls.data.total}
            onChange={goToPage}
          />
        )}
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
