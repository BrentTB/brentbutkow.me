import { useState } from 'react'
import { apiRoutes } from '../../../api/api'
import { AdminApiError } from '../admin-auth'
import {
  Paginated,
  SubscriptionAdminOut,
  SubscriptionAdminStatus,
  isSubscriptionAdmin,
  isSubscriptionPage,
} from '../admin.types'
import { formatDateTime, joinList } from '../admin-format'
import { StatusAction, statusActions } from '../subscription-actions'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import { Column, DataTable } from './DataTable'
import { Pagination } from './Pagination'
import styles from './Panel.module.scss'
import { SegmentedToggle } from '../../../components/inputs/SegmentedToggle'

const LIMIT = 50
const ALL = 'all'

const STATUS_LABELS: Record<SubscriptionAdminStatus, string> = {
  [SubscriptionAdminStatus.pendingConfirmation]: 'Pending',
  [SubscriptionAdminStatus.active]: 'Active',
  [SubscriptionAdminStatus.paused]: 'Paused',
  [SubscriptionAdminStatus.unsubscribed]: 'Unsubscribed',
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: 'All' },
  ...Object.values(SubscriptionAdminStatus).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  })),
]

// Shown before reviving an opt-out — the operator should only do this on the subscriber's request.
function confirmMessage(email: string): string {
  return `${email} unsubscribed on purpose. Only reactivate them if they asked to come back. Continue?`
}

const columns: Column<SubscriptionAdminOut>[] = [
  { key: 'email', header: 'Email', render: (s) => s.email },
  { key: 'status', header: 'Status', render: (s) => STATUS_LABELS[s.status] },
  { key: 'countries', header: 'Countries', render: (s) => joinList(s.countries) },
  { key: 'categories', header: 'Categories', render: (s) => joinList(s.categories) },
  { key: 'minSeverity', header: 'Min severity', render: (s) => s.minSeverity || '—' },
  { key: 'createdAt', header: 'Created', render: (s) => formatDateTime(s.createdAt) },
]

type SubscriptionDetailProps = {
  subscription: SubscriptionAdminOut
  onAction: (subscription: SubscriptionAdminOut, action: StatusAction) => void
  pending: boolean
  error: string | null
}

function SubscriptionDetail({ subscription, onAction, pending, error }: SubscriptionDetailProps) {
  const fields: { label: string; value: string }[] = [
    { label: 'Entities', value: joinList(subscription.entities) },
    { label: 'Companies', value: joinList(subscription.companies) },
    { label: 'Confirmed', value: formatDateTime(subscription.confirmedAt) },
    { label: 'Updated', value: formatDateTime(subscription.updatedAt) },
    { label: 'Last digest', value: formatDateTime(subscription.lastDigestAt) },
  ]
  const actions = statusActions(subscription.status)
  return (
    <div className={styles.detailBlock}>
      <dl className={styles.detail}>
        {fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action) => (
            <button
              key={action.to}
              type="button"
              className={styles.action}
              disabled={pending}
              onClick={() => onAction(subscription, action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className={styles.actionError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function SubscriptionsPanel() {
  const { request } = useAdminContext()
  const [status, setStatus] = useState<string>(ALL)
  const [offset, setOffset] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null)

  const query = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
  if (status !== ALL) query.set('status', status)
  const path = `${apiRoutes.admin.subscriptions}?${query.toString()}`
  const { data, loading, error, setData } = useAdminResource<Paginated<SubscriptionAdminOut>>(
    request,
    path,
    isSubscriptionPage
  )

  async function changeStatus(subscription: SubscriptionAdminOut, action: StatusAction) {
    if (action.confirm && !window.confirm(confirmMessage(subscription.email))) return
    setPendingId(subscription.id)
    setActionError(null)
    try {
      const updated = await request<SubscriptionAdminOut>(
        `${apiRoutes.admin.subscriptions}/${subscription.id}`,
        { method: 'PATCH', body: { status: action.to }, validate: isSubscriptionAdmin }
      )
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((s) => (s.id === updated.id ? updated : s)) } : prev
      )
    } catch (err) {
      const gone = err instanceof AdminApiError && err.status === 404
      setActionError({
        id: subscription.id,
        message: gone
          ? 'This subscription is gone — reload the list.'
          : 'Could not update the status. Try again.',
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.select}>
          <span>Status</span>
          <SegmentedToggle
            value={status}
            options={STATUS_OPTIONS}
            ariaLabel="Filter by status"
            onChange={(value) => {
              setStatus(value)
              setOffset(0)
            }}
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={(s) => s.id}
        loading={loading}
        error={error}
        emptyMessage="No subscriptions."
        renderExpanded={(s) => (
          <SubscriptionDetail
            subscription={s}
            onAction={changeStatus}
            pending={pendingId === s.id}
            error={actionError?.id === s.id ? actionError.message : null}
          />
        )}
      />
      {data && data.total > 0 && (
        <Pagination offset={offset} limit={LIMIT} total={data.total} onOffsetChange={setOffset} />
      )}
    </div>
  )
}
