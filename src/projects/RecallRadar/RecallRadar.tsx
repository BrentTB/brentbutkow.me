import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../components/utils/SafeLink'
import { getLinkArrow } from '../../components/utils/link-arrow'
import { useFunMode } from '../../contexts/useFunMode'
import { useDebouncedValue } from '../../api/useDebouncedValue'
import { Breakdowns } from './components/Breakdowns'
import { LocationSelector } from './components/LocationSelector'
import { Pagination } from './components/Pagination'
import { ProjectOverview } from './components/ProjectOverview'
import { RecallFeed } from './components/RecallFeed'
import { RecallFilters } from './components/RecallFilters'
import { RecallMap } from './components/RecallMap'
import { RecallTrendsChart } from './components/RecallTrendsChart'
import { SeverityBar } from './components/SeverityBar'
import { SectionNav, type NavSection } from './components/SectionNav'
import { SegmentedToggle } from '../../components/inputs/SegmentedToggle'
import { YearStepper } from './components/YearStepper'
import { StatusStrip } from './components/StatusStrip'
import { TrendCallouts } from './components/TrendCallouts'
import { HelpHint } from './components/HelpHint'
import { Themes } from './components/Themes'
import { Outbreaks } from './components/Outbreaks'
import { SubscriptionForm } from './subscription/SubscriptionForm'
import { SubscriptionPanel } from './subscription/SubscriptionPanel'
import { Select } from '../../components/inputs/Select'
import type { SelectOption } from '../../components/inputs/option.types'
import {
  categoryLabels,
  recallRadarCopy,
  recallRadarLinks,
  sortLabels,
  trendGroupLabels,
} from './data'
import { deriveYears, formatNumber, ingestFreshness } from './chart-format'
import { anomalyCallouts, deriveCallouts, forecastCallout } from './trend-callouts'
import { toChartMonths } from './trend-chart'
import {
  RecallCountry,
  RecallSort,
  EventSort,
  TrendGroup,
  isRecallCategory,
  isRecallClass,
  isRecallCountry,
  isRecallSort,
  isEventSort,
  isRecallSource,
  isSeverityLabel,
  isTrendGroup,
  isIsoDate,
  countFor,
  facetsFromStats,
  type RecallFilterValues,
  type TopicOut,
  type EventOut,
} from './recall.types'
import { useQueryParamsState } from '../../routes/useQueryParamsState'
import { useRecalls } from './useRecalls'
import { useRecallStats } from './useRecallStats'
import { useRecallTrend } from './useRecallTrend'
import { useTopics } from './useTopics'
import { useEvents } from './useEvents'
import { useFacets } from './useFacets'
import { useStickyHeader } from '../../components/navbar/useStickyHeader'
import styles from './RecallRadar.module.scss'

const EMPTY_FILTERS: RecallFilterValues = {
  category: '',
  classification: '',
  severity: '',
  topic: '',
  event: '',
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
  eventSort: EventSort.recent,
  year: '',
  page: '',
}

// The recall feed paginates this many rows at a time.
const PAGE_SIZE = 20

export function RecallRadar() {
  const { isFunMode } = useFunMode()
  const { values, patch: patchParams } = useQueryParamsState(DEFAULT_PARAMS)

  // Warm the lazy RecallDetail chunk — the feed→detail click is reachable only from here, so its
  // chunk is already fetched by the time it's clicked, while staying out of the initial bundle.
  useEffect(() => {
    void import('./RecallDetail')
  }, [])
  // Drives the sticky bar: `collapsed` swaps the location tabs for a dropdown once scrolled;
  // `navHidden` (shared with the site navbar's auto-hide) decides whether the bar sits below the
  // retracting navbar or slides up to the top to fill the gap.
  const { collapsed, navHidden } = useStickyHeader()

  // The sticky bar's height changes with the chips row and the More-filters panel, so publish it and
  // let the section rail + anchor offsets clear it dynamically — a fixed guess overflows the moment a
  // chip wraps or the panel expands.
  const barRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () => {
      document.documentElement.style.setProperty('--rr-bar-height', `${el.offsetHeight}px`)
    }
    publish()
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.documentElement.style.removeProperty('--rr-bar-height')
      }
    }
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--rr-bar-height')
    }
  }, [])

  // The mobile section rail docks to the bar's bottom edge. The bar's own sticky top shifts with the
  // navbar retract (0 ↔ --site-nav-height), so publish that offset for the rail to add onto
  // --rr-bar-height — without it the two drift apart and page content shows through the seam.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      '--rr-nav-offset',
      navHidden ? '0px' : 'var(--site-nav-height, 68px)'
    )
    return () => {
      document.documentElement.style.removeProperty('--rr-nav-offset')
    }
  }, [navHidden])

  // URL strings → typed UI state, validated rather than cast (query params are untrusted input).
  const country = isRecallCountry(values.location) ? values.location : RecallCountry.us
  const group = isTrendGroup(values.group) ? values.group : TrendGroup.category
  const sort = isRecallSort(values.sort) ? values.sort : RecallSort.recency
  const eventSort = isEventSort(values.eventSort) ? values.eventSort : EventSort.recent
  const year = values.year ? Number(values.year) : null
  const filters: RecallFilterValues = {
    category: isRecallCategory(values.category) ? values.category : '',
    classification: isRecallClass(values.classification) ? values.classification : '',
    severity: isSeverityLabel(values.severity) ? values.severity : '',
    // Topic is a slug in the URL (lowercase, digits, hyphens); guard junk so a bad ?topic= can't
    // reach the API.
    topic: /^[a-z0-9-]+$/.test(values.topic) ? values.topic : '',
    // Event is a slug too (same guard) — set via the Outbreaks cards / per-card badge.
    event: /^[a-z0-9-]+$/.test(values.event) ? values.event : '',
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
  // Paging only swaps the rows in place, so bring the recalls section back into view — otherwise
  // you're left wherever you scrolled to click the pager. Scroll only here (the user-initiated pager
  // click), never in an effect on `page`, so a first load or a shared ?page=N URL doesn't yank.
  const recallsRef = useRef<HTMLElement>(null)
  const goToPage = (next: number) => {
    patchParams({ page: next <= 1 ? '' : String(next) })
    recallsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // One filter set drives both the chart and the list, so they always describe the same recalls.
  // Stats (breakdowns, map, callouts) stay country-only — a global overview that also picks filters.
  const queryFilters = {
    country,
    category: filters.category || undefined,
    classification: filters.classification || undefined,
    severity: filters.severity || undefined,
    topic: filters.topic || undefined,
    event: filters.event || undefined,
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
  // Live option counts for the filter dropdowns, scoped to the current filter set (same query the
  // list + trend use, so the counts always describe the recalls on screen).
  const facets = useFacets(queryFilters)
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
  // Event/outbreak clusters, per country (refetch on country change). The id→event map drives the
  // per-recall outbreak badge; the active-event chip resolves the slug → label.
  const events = useEvents(country)
  const eventsById = useMemo(
    () => new Map(events.data?.map((event): [number, EventOut] => [event.id, event]) ?? []),
    [events.data]
  )
  const activeEventLabel = filters.event
    ? events.data?.find((event) => event.slug === filters.event)?.label
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
  // Per-year recall totals under the current filters — summed across groups from the (filter-scoped,
  // all-months) trend buckets. Feeds the year stepper's dropdown so empty years grey out + show 0,
  // while the arrows still walk every year linearly (no surprise skips).
  const yearCounts = useMemo(() => {
    const totals: Record<number, number> = {}
    for (const bucket of trend.data?.buckets ?? []) {
      const bucketYear = Number(bucket.month.slice(0, 4))
      totals[bucketYear] = (totals[bucketYear] ?? 0) + bucket.count
    }
    return totals
  }, [trend.data])
  // The forecast is overall (unfiltered) volume, so only overlay it when no filter narrows the
  // chart — grouping is fine, the stack still sums to the same total. Any active filter ⇒ no overlay.
  const trendFiltered = Object.entries(queryFilters).some(
    ([key, value]) => key !== 'country' && value !== undefined
  )
  // Source grouping stays omitted; offer total, cause, severity, and classification.
  const groupOptions: SelectOption[] = [
    TrendGroup.total,
    TrendGroup.category,
    TrendGroup.severity,
    TrendGroup.classification,
  ].map((value) => ({
    value,
    label: trendGroupLabels[value],
  }))
  const sortOptions: { value: RecallSort; label: string }[] = [
    RecallSort.recency,
    RecallSort.severity,
  ].map((value) => ({
    value,
    label: sortLabels[value],
  }))
  const freshness = stats.data ? ingestFreshness(stats.data.lastIngestAt, new Date()) : null

  const topCategory = stats.data?.byCategory.slice().sort((a, b) => b.count - a.count)[0]
  const topState = stats.data?.byState[0]
  const stateOptions = stats.data?.byState.map((entry) => entry.label) ?? []
  // Base (unfiltered) company presence — Canada's feed carries no firm name. Gates the company
  // filter + leaderboard so they hide for company-less sources, but stay put when a filter combo
  // merely happens to leave no companies.
  const hasCompanies = (stats.data?.byCompany.length ?? 0) > 0
  // The breakdown cards + state map read these counts; prefer the live (filter-scoped) facets, and
  // fall back to the global stats so they still render if the facets endpoint is unavailable.
  const breakdownFacets = facets.data ?? (stats.data ? facetsFromStats(stats.data) : null)
  // Backend-detected anomalies lead (the ML headline), then the forward-looking outlook, then the
  // descriptive summaries. The outlook is null when history is too short to forecast.
  const outlook = stats.data ? forecastCallout(stats.data.forecast, stats.data.byMonth) : null
  const callouts = stats.data
    ? [
        ...anomalyCallouts(stats.data.anomalies),
        ...(outlook ? [outlook] : []),
        ...deriveCallouts(stats.data),
      ]
    : []

  // Themes + outbreaks respect the active filters when the facets are loaded: keep only those with a
  // recall in the filtered set (counts keyed by surrogate id). Without facets, show them all.
  const topicCounts = facets.data?.topicCounts
  const eventCounts = facets.data?.eventCounts
  const visibleTopics = (topics.data ?? []).filter(
    (topic) => !topicCounts || countFor(topicCounts, topic.id) > 0
  )
  const visibleOutbreaks = (events.data ?? []).filter(
    (event) => event.isOutbreak && (!eventCounts || countFor(eventCounts, event.id) > 0)
  )
  const hasThemes = visibleTopics.length > 0
  const hasOutbreaks = visibleOutbreaks.length > 0

  // Entity-input suggestions for the subscription form, drawn from the live (filter-scoped) facets.
  // Company suggestions come from SubscriptionPanel's own server-backed type-ahead.
  const entityOptions = (facets.data?.entity ?? []).map((entry) => entry.label)

  // Side-nav jump targets — only the sections that actually render for this country/data, in the
  // order they appear in the content column. Memoized so SectionNav's observer keys off a stable
  // array and doesn't tear down and rebuild on every render.
  const navSections: NavSection[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      ...(hasOutbreaks ? [{ id: 'outbreaks', label: 'Outbreaks' }] : []),
      { id: 'trends', label: 'Trends' },
      ...(stats.data && country === RecallCountry.us ? [{ id: 'map', label: 'Map' }] : []),
      ...(stats.data ? [{ id: 'breakdowns', label: 'Breakdowns' }] : []),
      ...(hasThemes ? [{ id: 'themes', label: 'Themes' }] : []),
      { id: 'recalls', label: 'Recalls' },
      { id: 'alerts', label: 'Alerts' },
      { id: 'about', label: 'About' },
    ],
    [stats.data, country, hasOutbreaks, hasThemes]
  )

  return (
    <PageLayout>
      <PageHeader title={recallRadarCopy.title} showBackButton />
      <p className={styles.intro}>{isFunMode ? recallRadarCopy.introFun : recallRadarCopy.intro}</p>

      {/* Sticky control bar: a minimal heading + location scope on top, the filters beneath. Sits
          just under the site navbar, and slides up to the top when that navbar retracts on
          scroll-down (the `top` follows the shared navHidden signal). */}
      <div
        ref={barRef}
        className={styles.stickyBar}
        style={{ top: navHidden ? 0 : 'var(--site-nav-height, 68px)' }}
      >
        <div className={styles.barHead}>
          {/* The minimal title appears only once scrolled — at the top, the PageHeader already
              names the page, so showing it here too would just be noise. */}
          {collapsed && (
            <span className={styles.barTitle}>
              <span className={styles.barBlip} aria-hidden="true" />
              Recall Radar
            </span>
          )}
          <div className={styles.barLocation}>
            <LocationSelector value={country} collapsed={collapsed} onChange={changeCountry} />
          </div>
        </div>
        <RecallFilters
          filters={filters}
          country={country}
          stateOptions={stateOptions}
          hasCompanies={hasCompanies}
          facets={facets.data ?? undefined}
          activeFilters={queryFilters}
          topicLabel={activeTopicLabel}
          eventLabel={activeEventLabel}
          onChange={patch}
          onClear={clearFilters}
        />
      </div>

      <div className={styles.layout}>
        <SectionNav sections={navSections} />
        <div className={styles.content}>
          <section id="overview" className={styles.section}>
            {stats.data && (
              <>
                <StatusStrip
                  total={stats.data.total}
                  topCategoryLabel={topCategory ? categoryLabels[topCategory.category] : undefined}
                  topCategoryPct={
                    topCategory && stats.data.total > 0
                      ? Math.round((topCategory.count / stats.data.total) * 100)
                      : undefined
                  }
                  topState={topState?.label}
                  freshness={freshness}
                />
                <SeverityBar data={stats.data.bySeverity} />
              </>
            )}
            <TrendCallouts callouts={callouts} />
          </section>

          {hasOutbreaks && (
            <section id="outbreaks" className={styles.section}>
              <h2 className={styles.sectionTitle}>Outbreaks</h2>
              <p className={styles.hint}>
                Clusters of related recalls, such as a shared pathogen across products, retailers,
                or companies. Click one to narrow the recalls below to that incident.
              </p>
              <Outbreaks
                events={visibleOutbreaks}
                activeEvent={filters.event}
                onSelect={(slug) => patch({ event: slug })}
                sort={eventSort}
                onSortChange={(value) => patchParams({ eventSort: value })}
              />
            </section>
          )}

          <section id="trends" className={styles.section}>
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
                  <YearStepper
                    year={selectedYear}
                    years={years}
                    counts={yearCounts}
                    // The latest year is the implicit default, so clear the param when stepping back
                    // to it — keeps the default view's URL clean, like every other filter.
                    onChange={(value) =>
                      patchParams({ year: value === fallbackYear ? '' : String(value) })
                    }
                  />
                )}
              </div>
            </div>
            {trend.loading && <p className={styles.status}>Loading trend…</p>}
            {trend.error && <p className={styles.status}>Couldn’t load trend data.</p>}
            {trend.data && (
              <RecallTrendsChart
                data={chart.months}
                year={selectedYear}
                legend={chart.legend}
                forecast={trendFiltered ? undefined : stats.data?.forecast}
              />
            )}
          </section>

          {breakdownFacets && country === RecallCountry.us && (
            <section id="map" className={styles.section}>
              <h2 className={styles.sectionTitle}>{recallRadarCopy.stateMapTitle}</h2>
              <p className={styles.hint}>Click a state to filter the recalls below.</p>
              <RecallMap
                byState={breakdownFacets.state}
                activeState={filters.state}
                onSelect={(state) => patch({ state })}
              />
            </section>
          )}

          {breakdownFacets && (
            <section id="breakdowns" className={styles.section}>
              <h2 className={styles.sectionTitle}>Breakdowns</h2>
              <p className={styles.hint}>Click any row to filter the recalls below.</p>
              <Breakdowns
                facets={breakdownFacets}
                filters={filters}
                hasCompanies={hasCompanies}
                onSelect={patch}
              />
            </section>
          )}

          {hasThemes && (
            <section id="themes" className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Themes{' '}
                <HelpHint label="What is a theme?">
                  A theme is a group of recalls that describe their problem in similar words, found
                  automatically, not from a preset list. Its label is the words that set it apart
                  (e.g. “listeria · deli · meat”), and a recall joins it only if its text uses them.
                </HelpHint>
              </h2>
              <p className={styles.hint}>
                Auto-discovered topics across recall text. Click one to filter the recalls below.
              </p>
              <Themes
                topics={visibleTopics}
                activeTopic={filters.topic}
                onSelect={(slug) => patch({ topic: slug })}
                counts={topicCounts}
              />
            </section>
          )}

          <section id="recalls" className={styles.section} ref={recallsRef}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                Recalls{recalls.data ? ` (${formatNumber(recalls.data.total)})` : ''}
              </h2>
              <div className={styles.controls}>
                <SegmentedToggle
                  ariaLabel="Sort recalls"
                  value={sort}
                  options={sortOptions}
                  onChange={(value) => patchParams({ sort: value, page: '' })}
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
                activeTopic={filters.topic}
                eventsById={eventsById}
                onEventSelect={(slug) => patch({ event: slug })}
                activeEvent={filters.event}
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

          <section id="alerts" className={styles.section}>
            <h2 className={styles.sectionTitle}>Recall alerts</h2>
            <p className={styles.hint}>
              Get a daily email when new recalls match your filters. Your current dashboard filters
              pre-fill the form.
            </p>
            <SubscriptionPanel>
              <SubscriptionForm
                initialFilters={filters}
                country={country}
                entityOptions={entityOptions}
              />
            </SubscriptionPanel>
          </section>

          <section id="about" className={styles.section}>
            <ProjectOverview />
          </section>
        </div>
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
