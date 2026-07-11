import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { RecallJumpButton } from './components/RecallJumpButton'
import { RecallMap } from './components/RecallMap'
import { RecallTrendsChart } from './components/RecallTrendsChart'
import { SeverityBar } from './components/SeverityBar'
import { SectionNav, type NavSection } from './components/SectionNav'
import { ViewTabs } from './components/ViewTabs'
import { AlertsDialog } from './components/AlertsDialog'
import { Skeleton } from './components/Skeleton'
import { SegmentedToggle } from '../../components/inputs/SegmentedToggle'
import { YearStepper } from './components/YearStepper'
import { StatusStrip } from './components/StatusStrip'
import { TrendCallouts } from './components/TrendCallouts'
import { HelpHint } from './components/HelpHint'
import { Themes } from './components/Themes'
import { Outbreaks } from './components/Outbreaks'
import { SubscriptionForm } from './subscription/SubscriptionForm'
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
import { STATE_GRID_COLS, STATE_GRID_ROWS, stateGrid } from './us-state-grid'
import { EU_GRID_COLS, EU_GRID_ROWS, euCountryGrid } from './eu-country-grid'
import { anomalyCallouts, deriveCallouts, forecastCallout } from './trend-callouts'
import { toChartMonths } from './trend-chart'
import {
  RecallCountry,
  RecallSort,
  RecallView,
  EventSort,
  TrendGroup,
  isRecallCategory,
  isRecallClass,
  isRecallCountry,
  isRecallSort,
  isRecallView,
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
import { useMediaQuery } from './useMediaQuery'
import styles from './RecallRadar.module.scss'

const EMPTY_FILTERS: RecallFilterValues = {
  category: '',
  classification: '',
  severity: '',
  topic: '',
  event: '',
  state: '',
  affectedCountry: '',
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
  view: RecallView.dashboard,
  group: TrendGroup.category,
  sort: RecallSort.recency,
  eventSort: EventSort.recent,
  year: '',
  page: '',
  open: '',
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
  // Below this the location tabs plus the alerts button overflow the bar, so fold the scope to a
  // dropdown early — wider than the ≤600px phone styles, which is where the tabs first stop
  // fitting. Measured for the compact tab labels: view tabs (~254px) + five location tabs (~355px)
  // + the alerts button (~120px) + gaps/padding run out just under 800px.
  const compactScope = useMediaQuery('(max-width: 830px)')

  // The alert-signup form drops open from the command strip's "Get alerts" button, so it's reachable
  // from any tab without hunting for a section. Mounting it only while open snapshots the live
  // filters each time (and resets on reopen).
  const [alertsOpen, setAlertsOpen] = useState(false)

  // The sticky bar's height changes with the chips row and the More-filters panel, so publish it and
  // let the section rail + anchor offsets clear it dynamically — a fixed guess overflows the moment a
  // chip wraps or the panel expands.
  const barRef = useRef<HTMLDivElement>(null)
  // The (non-sticky) content column — a stable anchor for scrolling the data under the pinned strip.
  const contentRef = useRef<HTMLDivElement>(null)
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
  const view = isRecallView(values.view) ? values.view : RecallView.dashboard
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
    // ISO alpha-2 (the EU map/filter); guard junk so a bad ?affectedCountry= can't reach the API.
    affectedCountry: /^[A-Za-z]{2}$/.test(values.affectedCountry)
      ? values.affectedCountry.toUpperCase()
      : '',
    company: values.company,
    source: isRecallSource(values.source) ? values.source : '',
    entity: values.entity,
    search: values.search,
    since: isIsoDate(values.since) ? values.since : '',
    until: isIsoDate(values.until) ? values.until : '',
  }
  const debouncedSearch = useDebouncedValue(filters.search, 500)
  // Any non-default filter narrows the set — the cue to offer a jump to the scoped recall list.
  const hasActiveFilters = Object.values(filters).some(Boolean)

  // Any filter change resets to page 1; the pager sets `page` directly (goToPage).
  const patch = (next: Partial<RecallFilterValues>) => patchParams({ ...next, page: '' })
  const clearFilters = () => patchParams({ ...EMPTY_FILTERS, page: '' })
  // Snap the content's top just under the pinned command strip — the dashboard's own header, not the
  // page top. Targets an absolute scrollY (not scrollIntoView) and jumps instantly: the content's top
  // is fixed by the header + strip above it, so the number holds even when the new country renders a
  // shorter page. An instant jump commits before that reflow, sidestepping the race that clamped a
  // smooth scroll to the top. `onlyIfBelow` skips it when the line is already in view, so a country
  // swap near the top doesn't yank you.
  const scrollToStripTop = (onlyIfBelow: boolean) => {
    const content = contentRef.current
    if (!content) return
    const clearance = 68 + (barRef.current?.offsetHeight ?? 110) + 12
    const contentTop = content.getBoundingClientRect().top + window.scrollY
    const target = Math.max(0, contentTop - clearance)
    if (onlyIfBelow && window.scrollY <= target + 4) return
    window.scrollTo({ top: target })
  }
  // Switching country is a fresh view — reset filters + year so US selections don't leak into UK, and
  // drop the expanded rows since those recall numbers belong to the old country's feed.
  // If you're scrolled down into the data, come back up to the strip; if you're already up top, stay.
  const changeCountry = (next: RecallCountry) => {
    patchParams({ location: next, ...EMPTY_FILTERS, year: '', page: '', open: '' })
    scrollToStripTop(true)
  }
  // Switching tabs keeps the filters (they scope every tab). If you were scrolled down into the old
  // tab, come back up so the new tab starts at its top; if you were already up top, stay put.
  const changeView = (next: RecallView) => {
    patchParams({ view: next === RecallView.dashboard ? '' : next })
    scrollToStripTop(true)
  }
  const page = Math.max(1, Number(values.page) || 1)
  // Expanded feed rows ride the URL as comma-separated recall numbers, so a refresh or shared link
  // restores them. Entries not on the current page are simply ignored by the feed.
  const openRows = useMemo(() => new Set(values.open.split(',').filter(Boolean)), [values.open])
  const toggleRow = (recallNumber: string, isOpen: boolean) => {
    const next = new Set(openRows)
    if (isOpen) next.add(recallNumber)
    else next.delete(recallNumber)
    patchParams({ open: [...next].join(',') })
  }
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
    affectedCountry: filters.affectedCountry || undefined,
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
  // A restored ?open= row acts like a #fragment: the first time the feed renders one, jump to it.
  // One shot per visit — the flag is consumed even when nothing matches, so later toggles, paging,
  // and filter changes never yank the scroll.
  const scrolledToOpenRow = useRef(false)
  useEffect(() => {
    if (scrolledToOpenRow.current || view !== RecallView.recalls || !recalls.data) return
    scrolledToOpenRow.current = true
    const target = recalls.data.items.find((item) => openRows.has(item.recallNumber))
    if (target) document.getElementById(`recall-${target.recallNumber}`)?.scrollIntoView()
  }, [view, recalls.data, openRows])
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
  // The in-progress calendar month, so the chart can project its partial bar to a full-month total.
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
    RecallSort.novelty,
  ].map((value) => ({
    value,
    label: sortLabels[value],
  }))
  // The tab labels; the recall count rides along once the list has loaded.
  const viewOptions: { value: RecallView; label: string }[] = [
    { value: RecallView.dashboard, label: 'Dashboard' },
    {
      value: RecallView.recalls,
      label: recalls.data ? `Recalls (${formatNumber(recalls.data.total)})` : 'Recalls',
    },
    { value: RecallView.about, label: 'About' },
  ]
  const freshness = stats.data ? ingestFreshness(stats.data.lastIngestAt, new Date()) : null

  const topCategory = stats.data?.byCategory.slice().sort((a, b) => b.count - a.count)[0]
  const topState = stats.data?.byState[0]
  const stateOptions = stats.data?.byState.map((entry) => entry.label) ?? []
  const affectedCountryOptions = stats.data?.byAffectedCountry?.map((entry) => entry.label) ?? []
  // The map renders wherever the data carries a tile-grid geography: US states, EU countries.
  const showMap = country === RecallCountry.us || country === RecallCountry.eu
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
  // Company suggestions come from CompanyFilter's own server-backed type-ahead.
  const entityOptions = (facets.data?.entity ?? []).map((entry) => entry.label)

  // Side-nav jump targets for the Dashboard tab — only the sections that actually render for this
  // country/data, in the order they appear in the content column. The Recalls and About tabs are
  // single surfaces, so they carry no rail. Memoized so SectionNav's observer keys off a stable array
  // and doesn't tear down and rebuild on every render.
  const navSections: NavSection[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      ...(hasOutbreaks ? [{ id: 'outbreaks', label: 'Outbreaks' }] : []),
      { id: 'trends', label: 'Trends' },
      ...(stats.data ? [{ id: 'breakdowns', label: 'Breakdowns' }] : []),
      ...(hasThemes ? [{ id: 'themes', label: 'Themes' }] : []),
      ...(stats.data && showMap ? [{ id: 'map', label: 'Map' }] : []),
    ],
    [stats.data, showMap, hasOutbreaks, hasThemes]
  )
  const showRail = view === RecallView.dashboard

  return (
    <PageLayout>
      <PageHeader title={recallRadarCopy.title} />
      <p className={styles.intro}>{isFunMode ? recallRadarCopy.introFun : recallRadarCopy.intro}</p>

      {/* Sticky control bar: a minimal heading + location scope on top, the filters beneath. Sits
          just under the site navbar, and slides up to the top when that navbar retracts on
          scroll-down (the `top` follows the shared navHidden signal). */}
      <div
        ref={barRef}
        className={styles.stickyBar}
        // Whether the section rail docks directly beneath the bar (Dashboard only). On a phone that
        // decides the bar's bottom corners: squared to connect into the rail, rounded when nothing
        // follows it (Recalls / About).
        data-rail={showRail}
        style={{ top: navHidden ? 0 : 'var(--site-nav-height, 68px)' }}
      >
        <div className={styles.barHead}>
          <ViewTabs
            ariaLabel="Recall Radar view"
            value={view}
            options={viewOptions}
            onChange={changeView}
            panelId="rr-view-panel"
          />
          <div className={styles.barActions}>
            {/* On a phone the tab row eats too much width, so keep the scope a dropdown there. */}
            <LocationSelector
              value={country}
              collapsed={collapsed || compactScope}
              onChange={changeCountry}
            />
            {/* Sits last so it stays pinned to the strip's right edge — the location control's width
                changes when it collapses to a dropdown, and anything after it would shift. */}
            <button
              type="button"
              className={styles.alertsButton}
              aria-haspopup="dialog"
              aria-expanded={alertsOpen}
              onClick={() => setAlertsOpen((v) => !v)}
            >
              <span className={styles.alertsIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor">
                  <path d="M4 6h16v12H4z" strokeWidth="1.7" strokeLinejoin="round" />
                  <path
                    d="m4 7 8 6 8-6"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Get alerts
            </button>
          </div>
        </div>
        <RecallFilters
          filters={filters}
          country={country}
          stateOptions={stateOptions}
          affectedCountryOptions={affectedCountryOptions}
          hasCompanies={hasCompanies}
          facets={facets.data ?? undefined}
          activeFilters={queryFilters}
          topicLabel={activeTopicLabel}
          eventLabel={activeEventLabel}
          onChange={patch}
          onClear={clearFilters}
        />
      </div>

      {alertsOpen && (
        <AlertsDialog
          title="Get recall alerts by email"
          description="A daily digest when new recalls match your filters. Your current filters pre-fill the form."
          onClose={() => setAlertsOpen(false)}
        >
          <SubscriptionForm
            initialFilters={filters}
            country={country}
            entityOptions={entityOptions}
          />
        </AlertsDialog>
      )}

      <div className={showRail ? styles.layout : styles.layoutSolo}>
        {showRail && <SectionNav sections={navSections} />}
        <div
          ref={contentRef}
          className={styles.content}
          id="rr-view-panel"
          role="tabpanel"
          aria-labelledby={`rr-view-panel-tab-${view}`}
        >
          {view === RecallView.dashboard && (
            <>
              <section id="overview" className={styles.section}>
                {stats.data ? (
                  <>
                    <StatusStrip
                      total={stats.data.total}
                      topCategoryLabel={
                        topCategory ? categoryLabels[topCategory.category] : undefined
                      }
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
                ) : (
                  stats.loading && (
                    <div className={styles.loadingStack}>
                      <Skeleton height={42} radius={12} />
                      <Skeleton height={58} radius={12} />
                    </div>
                  )
                )}
                <TrendCallouts callouts={callouts} />
              </section>

              {hasOutbreaks && (
                <section id="outbreaks" className={styles.section}>
                  <h2 className={styles.sectionTitle}>Outbreaks</h2>
                  <p className={styles.hint}>
                    Clusters of related recalls, such as a shared pathogen across products,
                    retailers, or companies. Click one to narrow the recalls below to that incident.
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
                {trend.loading && !trend.data && <Skeleton height={240} radius={12} />}
                {trend.error && <p className={styles.status}>Couldn’t load trend data.</p>}
                {trend.data && (
                  <RecallTrendsChart
                    data={chart.months}
                    year={selectedYear}
                    legend={chart.legend}
                    forecast={trendFiltered ? undefined : stats.data?.forecast}
                    currentMonth={currentMonth}
                  />
                )}
              </section>

              {breakdownFacets && (
                <section id="breakdowns" className={styles.section}>
                  <h2 className={styles.sectionTitle}>Breakdowns</h2>
                  <p className={styles.hint}>Click any row to filter the recalls.</p>
                  <Breakdowns
                    facets={breakdownFacets}
                    filters={filters}
                    hasCompanies={hasCompanies}
                    onSelect={patch}
                  />
                </section>
              )}

              {/* Themes + Map share a row. Themes runs full width (two internal columns) when the
                  map is absent, and narrows to one column beside the map on US/EU. */}
              {(hasThemes || (breakdownFacets && showMap)) && (
                <div className={styles.dashRow}>
                  {hasThemes && (
                    <section id="themes" className={styles.section}>
                      <h2 className={styles.sectionTitle}>
                        Themes{' '}
                        <HelpHint label="What is a theme?">
                          A theme is a group of recalls that describe similar problems, found
                          automatically, not from a preset list. Its label is the words that set it
                          apart (e.g. “listeria · deli · meat”), and a recall joins it when its
                          description means much the same thing — even if it doesn’t use those exact
                          words.
                        </HelpHint>
                      </h2>
                      <p className={styles.hint}>
                        Auto-discovered topics across recall text. Click one to filter the recalls.
                      </p>
                      <Themes
                        topics={visibleTopics}
                        activeTopic={filters.topic}
                        onSelect={(slug) => patch({ topic: slug })}
                        counts={topicCounts}
                        // Beside a map the list sits in one narrow column, so cap it shorter.
                        maxRows={showMap ? 10 : 16}
                      />
                    </section>
                  )}

                  {breakdownFacets && country === RecallCountry.us && (
                    <section id="map" className={styles.section}>
                      <h2 className={styles.sectionTitle}>{recallRadarCopy.stateMapTitle}</h2>
                      <p className={styles.hint}>Click a state to filter the recalls.</p>
                      <RecallMap
                        tiles={stateGrid}
                        rows={STATE_GRID_ROWS}
                        cols={STATE_GRID_COLS}
                        ariaLabel="US food recalls by state"
                        counts={breakdownFacets.state}
                        activeCode={filters.state}
                        onSelect={(state) => patch({ state })}
                      />
                    </section>
                  )}

                  {breakdownFacets && country === RecallCountry.eu && (
                    <section id="map" className={styles.section}>
                      <h2 className={styles.sectionTitle}>{recallRadarCopy.euMapTitle}</h2>
                      <p className={styles.hint}>
                        Countries that raised or received each recall. Click one to filter the
                        recalls.
                      </p>
                      <RecallMap
                        tiles={euCountryGrid}
                        rows={EU_GRID_ROWS}
                        cols={EU_GRID_COLS}
                        ariaLabel="EU food recalls by country"
                        counts={breakdownFacets.affectedCountry ?? []}
                        activeCode={filters.affectedCountry}
                        onSelect={(affectedCountry) => patch({ affectedCountry })}
                      />
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {view === RecallView.recalls && (
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
              {recalls.loading && !recalls.data && (
                <div className={styles.loadingStack}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} height={34} radius={8} />
                  ))}
                </div>
              )}
              {recalls.error && <p className={styles.status}>Couldn’t reach the recall service.</p>}
              {recalls.data && (
                <RecallFeed
                  recalls={recalls.data.items}
                  openRows={openRows}
                  onRowToggle={toggleRow}
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
          )}

          {view === RecallView.about && (
            <section id="about" className={styles.section}>
              <ProjectOverview />
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
            </section>
          )}
        </div>
      </div>

      {view === RecallView.dashboard &&
        hasActiveFilters &&
        recalls.data &&
        recalls.data.total > 0 && (
          <RecallJumpButton
            count={recalls.data.total}
            onClick={() => changeView(RecallView.recalls)}
          />
        )}
    </PageLayout>
  )
}
