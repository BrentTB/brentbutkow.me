import { useEffect, useState } from 'react'
import { apiRoutes } from '../../../api/api'
import { SegmentedToggle } from '../../../components/inputs/SegmentedToggle'
import { NullSpaceFilter, Paginated, ScoreAdminOut, isScorePage } from '../admin.types'
import { formatDateTime, formatDuration } from '../admin-format'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import { Column, DataTable } from './DataTable'
import { Pagination } from './Pagination'
import styles from './Panel.module.scss'

const LIMIT = 50

const FILTER_OPTIONS: { value: NullSpaceFilter; label: string }[] = [
  { value: NullSpaceFilter.all, label: 'All runs' },
  { value: NullSpaceFilter.flagged, label: 'Flagged only' },
  { value: NullSpaceFilter.legit, label: 'Legit only' },
]

// Maps a UI filter to the `flagged` query param; `all` omits it.
const FLAGGED_PARAM: Record<NullSpaceFilter, string | null> = {
  [NullSpaceFilter.all]: null,
  [NullSpaceFilter.flagged]: 'true',
  [NullSpaceFilter.legit]: 'false',
}

const columns: Column<ScoreAdminOut>[] = [
  { key: 'createdAt', header: 'Played', render: (s) => formatDateTime(s.createdAt) },
  { key: 'name', header: 'Name', render: (s) => s.name },
  { key: 'score', header: 'Score', numeric: true, render: (s) => s.score.toLocaleString() },
  { key: 'kills', header: 'Kills', numeric: true, render: (s) => s.kills },
  { key: 'wave', header: 'Wave', numeric: true, render: (s) => s.wave },
  { key: 'level', header: 'Level', numeric: true, render: (s) => s.level },
  {
    key: 'flag',
    header: 'Flag',
    render: (s) =>
      s.flagged ? <span className={styles.flag}>{s.flagReason || 'flagged'}</span> : '—',
  },
]

function ScoreDetail({ score }: { score: ScoreAdminOut }) {
  const fields: { label: string; value: string | number }[] = [
    { label: 'Duration', value: formatDuration(score.durationMs) },
    { label: 'Ship', value: score.shipKind },
    { label: 'Version', value: score.version },
    { label: 'Currency', value: score.currency.toLocaleString() },
    { label: 'Space metal', value: score.spaceMetal.toLocaleString() },
    { label: 'Upgrades bought', value: score.upgradesPurchased },
    { label: 'Ultimates owned', value: score.ultimatesOwned },
    { label: 'IP address', value: score.ipAddress || '—' },
  ]
  return (
    <dl className={styles.detail}>
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

type NullSpacePanelProps = {
  filter: NullSpaceFilter
  onFilterChange: (filter: NullSpaceFilter) => void
}

export function NullSpacePanel({ filter, onFilterChange }: NullSpacePanelProps) {
  const { request } = useAdminContext()
  const [offset, setOffset] = useState(0)

  // A new filter is a fresh result set — jump back to the first page.
  useEffect(() => setOffset(0), [filter])

  const query = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
  const flaggedParam = FLAGGED_PARAM[filter]
  if (flaggedParam !== null) query.set('flagged', flaggedParam)
  const path = `${apiRoutes.admin.nullspace}?${query.toString()}`
  const { data, loading, error } = useAdminResource<Paginated<ScoreAdminOut>>(
    request,
    path,
    isScorePage
  )

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.select}>
          <span>Show</span>
          <SegmentedToggle
            value={filter}
            options={FILTER_OPTIONS}
            ariaLabel="Filter scores"
            onChange={onFilterChange}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={(s) => s.id}
        loading={loading}
        error={error}
        emptyMessage="No scores."
        renderExpanded={(s) => <ScoreDetail score={s} />}
      />
      {data && data.total > 0 && (
        <Pagination offset={offset} limit={LIMIT} total={data.total} onOffsetChange={setOffset} />
      )}
    </div>
  )
}
