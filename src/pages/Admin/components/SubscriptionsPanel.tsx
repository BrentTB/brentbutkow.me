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
import { subscriptionDetailFields } from '../subscription-detail'
import { StatusAction, statusActions } from '../subscription-actions'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import { Column, DataTable } from './DataTable'
import { Pagination } from './Pagination'
import { SubscriptionEditForm } from './SubscriptionEditForm'
import styles from './Panel.module.scss'
import { SegmentedToggle } from '../../../components/inputs/SegmentedToggle'
import { useFacets } from '../../../projects/RecallRadar/useFacets'
import type { FilterPayload } from '../../../projects/RecallRadar/subscription/subscription-api'

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
  entityOptions: string[]
  onAction: (subscription: SubscriptionAdminOut, action: StatusAction) => void
  onSave: (subscription: SubscriptionAdminOut, payload: FilterPayload) => Promise<boolean>
  pending: boolean
  error: string | null
}

function SubscriptionDetail({
  subscription,
  entityOptions,
  onAction,
  onSave,
  pending,
  error,
}: SubscriptionDetailProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <SubscriptionEditForm
        subscription={subscription}
        entityOptions={entityOptions}
        pending={pending}
        error={error}
        onCancel={() => setEditing(false)}
        onSave={async (payload) => {
          if (await onSave(subscription, payload)) setEditing(false)
        }}
      />
    )
  }

  const fields = subscriptionDetailFields(subscription)
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
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          disabled={pending}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
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

  // Entity autocomplete for the edit form, from the public recall facets (same source the subscribe
  // form uses). Company suggestions come from the form's own server-backed type-ahead.
  const facets = useFacets({})
  const entityOptions = (facets.data?.entity ?? []).map((entry) => entry.label)

  // One PATCH path for both status changes and field edits — splices the updated row in on success.
  async function patchSubscription(id: string, body: object): Promise<boolean> {
    setPendingId(id)
    setActionError(null)
    try {
      const updated = await request<SubscriptionAdminOut>(
        `${apiRoutes.admin.subscriptions}/${id}`,
        { method: 'PATCH', body, validate: isSubscriptionAdmin }
      )
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((s) => (s.id === updated.id ? updated : s)) } : prev
      )
      return true
    } catch (err) {
      const status = err instanceof AdminApiError ? err.status : 0
      setActionError({
        id,
        message:
          status === 404
            ? 'This subscription is gone. Reload the list.'
            : status === 422
              ? 'Those values were rejected. Check them and try again.'
              : 'Could not save. Try again.',
      })
      return false
    } finally {
      setPendingId(null)
    }
  }

  function changeStatus(subscription: SubscriptionAdminOut, action: StatusAction) {
    if (action.confirm && !window.confirm(confirmMessage(subscription.email))) return
    void patchSubscription(subscription.id, { status: action.to })
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
            entityOptions={entityOptions}
            onAction={changeStatus}
            onSave={(sub, payload) => patchSubscription(sub.id, payload)}
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
