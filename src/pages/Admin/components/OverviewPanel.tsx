import { ReactNode } from 'react'
import { apiRoutes } from '../../../api/api'
import { Overview, isOverview } from '../admin.types'
import { formatDateTime } from '../admin-format'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import styles from './OverviewPanel.module.scss'

type Stat = { label: string; value: ReactNode }

function Readout({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <dl className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <dt className={styles.statLabel}>{stat.label}</dt>
            <dd className={styles.statValue}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type OverviewPanelProps = {
  onInspectFlaggedScores: () => void
}

export function OverviewPanel({ onInspectFlaggedScores }: OverviewPanelProps) {
  const { request } = useAdminContext()
  const { data, loading, error } = useAdminResource<Overview>(
    request,
    apiRoutes.admin.overview,
    isOverview
  )

  if (loading) return <p className={styles.state}>Loading…</p>
  if (error) return <p className={`${styles.state} ${styles.error}`}>{error}</p>
  if (!data) return null

  const groups: { title: string; stats: Stat[] }[] = [
    {
      title: 'Messages',
      stats: [
        { label: 'Total', value: data.messages.total },
        { label: 'Real', value: data.messages.real },
        { label: 'Bot', value: data.messages.bot },
      ],
    },
    {
      title: 'Subscriptions',
      stats: [
        { label: 'Total', value: data.subscriptions.total },
        { label: 'Active', value: data.subscriptions.active },
        { label: 'Pending', value: data.subscriptions.pendingConfirmation },
        { label: 'Paused', value: data.subscriptions.paused },
        { label: 'Unsubscribed', value: data.subscriptions.unsubscribed },
      ],
    },
    {
      title: 'Recall ingest',
      stats: data.ingest
        ? [
            { label: 'Last run', value: formatDateTime(data.ingest.lastRunAt) },
            { label: 'Status', value: data.ingest.status },
            { label: 'Fetched', value: data.ingest.fetchedCount },
            { label: 'Upserted', value: data.ingest.upsertedCount },
          ]
        : [{ label: 'Last run', value: 'Never run' }],
    },
    {
      title: 'Recalls',
      stats: [
        { label: 'Total', value: data.recalls.total },
        { label: 'US', value: data.recalls.us },
        { label: 'UK', value: data.recalls.uk },
        { label: 'ZA', value: data.recalls.za },
      ],
    },
    {
      title: 'Null Space',
      stats: [
        { label: 'Total', value: data.nullspace.total },
        { label: 'Legit', value: data.nullspace.legit },
        {
          label: 'Flagged',
          value:
            data.nullspace.flagged > 0 ? (
              <button type="button" className={styles.inspect} onClick={onInspectFlaggedScores}>
                {data.nullspace.flagged}
              </button>
            ) : (
              data.nullspace.flagged
            ),
        },
      ],
    },
  ]

  return (
    <div className={styles.grid}>
      {groups.map((group) => (
        <Readout key={group.title} title={group.title} stats={group.stats} />
      ))}
    </div>
  )
}
