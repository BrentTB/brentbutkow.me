import { useState } from 'react'
import { apiRoutes } from '../../../api/api'
import {
  Paginated,
  SubscriptionAdminOut,
  SubscriptionAdminStatus,
  isSubscriptionPage,
} from '../admin.types'
import { formatDateTime, joinList } from '../admin-format'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import { Column, DataTable } from './DataTable'
import { Pagination } from './Pagination'
import styles from './Panel.module.scss'

const LIMIT = 50
const ALL = 'all'

const STATUS_LABELS: Record<SubscriptionAdminStatus, string> = {
  [SubscriptionAdminStatus.pendingConfirmation]: 'Pending',
  [SubscriptionAdminStatus.active]: 'Active',
  [SubscriptionAdminStatus.paused]: 'Paused',
  [SubscriptionAdminStatus.unsubscribed]: 'Unsubscribed',
}

const columns: Column<SubscriptionAdminOut>[] = [
  { key: 'email', header: 'Email', render: (s) => s.email },
  { key: 'status', header: 'Status', render: (s) => STATUS_LABELS[s.status] ?? s.status },
  { key: 'countries', header: 'Countries', render: (s) => joinList(s.countries) },
  { key: 'categories', header: 'Categories', render: (s) => joinList(s.categories) },
  { key: 'minSeverity', header: 'Min severity', render: (s) => s.minSeverity || '—' },
  { key: 'createdAt', header: 'Created', render: (s) => formatDateTime(s.createdAt) },
]

function SubscriptionDetail({ subscription }: { subscription: SubscriptionAdminOut }) {
  const fields: { label: string; value: string }[] = [
    { label: 'Entities', value: joinList(subscription.entities) },
    { label: 'Companies', value: joinList(subscription.companies) },
    { label: 'Confirmed', value: formatDateTime(subscription.confirmedAt) },
    { label: 'Updated', value: formatDateTime(subscription.updatedAt) },
    { label: 'Last digest', value: formatDateTime(subscription.lastDigestAt) },
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

export function SubscriptionsPanel() {
  const { request } = useAdminContext()
  const [status, setStatus] = useState<string>(ALL)
  const [offset, setOffset] = useState(0)

  const query = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
  if (status !== ALL) query.set('status', status)
  const path = `${apiRoutes.admin.subscriptions}?${query.toString()}`
  const { data, loading, error } = useAdminResource<Paginated<SubscriptionAdminOut>>(
    request,
    path,
    isSubscriptionPage
  )

  return (
    <div>
      <div className={styles.toolbar}>
        <label className={styles.select}>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setOffset(0)
            }}
          >
            <option value={ALL}>All</option>
            {Object.values(SubscriptionAdminStatus).map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={(s) => s.id}
        loading={loading}
        error={error}
        emptyMessage="No subscriptions."
        renderExpanded={(s) => <SubscriptionDetail subscription={s} />}
      />
      {data && data.total > 0 && (
        <Pagination offset={offset} limit={LIMIT} total={data.total} onOffsetChange={setOffset} />
      )}
    </div>
  )
}
