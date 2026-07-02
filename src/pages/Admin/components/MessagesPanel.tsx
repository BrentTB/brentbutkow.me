import { useEffect, useState } from 'react'
import { apiRoutes } from '../../../api/api'
import { SegmentedToggle } from '../../../components/inputs/SegmentedToggle'
import { AdminApiError } from '../admin-auth'
import {
  MessageOut,
  MessageSeenFilter,
  Paginated,
  isMessageAdmin,
  isMessagePage,
} from '../admin.types'
import { formatDateTime } from '../admin-format'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import { Column, DataTable } from './DataTable'
import { Pagination } from './Pagination'
import styles from './Panel.module.scss'

const LIMIT = 50

const SEEN_OPTIONS: { value: MessageSeenFilter; label: string }[] = [
  { value: MessageSeenFilter.all, label: 'All' },
  { value: MessageSeenFilter.unread, label: 'Unread' },
  { value: MessageSeenFilter.read, label: 'Read' },
]

// Maps a UI filter to the `seen` query param; `all` omits it.
const SEEN_PARAM: Record<MessageSeenFilter, string | null> = {
  [MessageSeenFilter.all]: null,
  [MessageSeenFilter.unread]: 'false',
  [MessageSeenFilter.read]: 'true',
}

const columns: Column<MessageOut>[] = [
  { key: 'createdAt', header: 'Received', render: (m) => formatDateTime(m.createdAt) },
  { key: 'name', header: 'Name', render: (m) => m.name || '—' },
  { key: 'email', header: 'Email', render: (m) => m.email || '—' },
  {
    key: 'message',
    header: 'Message',
    render: (m) => <span className={styles.clamp}>{m.message}</span>,
  },
  { key: 'country', header: 'Country', render: (m) => m.country || '—' },
  {
    key: 'seen',
    header: 'Seen',
    render: (m) => (m.seen ? <span className={styles.seen}>✓</span> : '—'),
  },
  {
    key: 'bot',
    header: 'Bot',
    render: (m) =>
      m.isBot ? <span className={styles.flag}>{m.botReason || 'flagged'}</span> : '—',
  },
]

type MessageDetailProps = {
  message: MessageOut
  onToggleSeen: (message: MessageOut) => void
  pending: boolean
  error: string | null
}

function MessageDetail({ message, onToggleSeen, pending, error }: MessageDetailProps) {
  const fields: { label: string; value: string | null }[] = [
    { label: 'Timezone', value: message.timezone },
    { label: 'Locale', value: message.locale },
    { label: 'Accept-Language', value: message.acceptLanguage },
    { label: 'Referrer', value: message.referrer },
    { label: 'IP address', value: message.ipAddress },
    { label: 'User agent', value: message.userAgent },
  ]
  return (
    <div className={styles.detailBlock}>
      <dl className={styles.detail}>
        <div className={styles.detailFull}>
          <dt>Full message</dt>
          <dd>{message.message}</dd>
        </div>
        {fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value || '—'}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={message.seen}
            disabled={pending}
            onChange={() => onToggleSeen(message)}
          />
          Seen
        </label>
      </div>
      {error && (
        <p className={styles.actionError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

type MessagesPanelProps = {
  seenFilter: MessageSeenFilter
  onSeenFilterChange: (filter: MessageSeenFilter) => void
  includeBots: boolean
  onIncludeBotsChange: (includeBots: boolean) => void
  // Called after a message's seen state changes, so the caller can refresh the unread badge.
  onSeenChange?: () => void
}

export function MessagesPanel({
  seenFilter,
  onSeenFilterChange,
  includeBots,
  onIncludeBotsChange,
  onSeenChange,
}: MessagesPanelProps) {
  const { request } = useAdminContext()
  const [offset, setOffset] = useState(0)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null)

  // A new filter is a fresh result set — jump back to the first page.
  useEffect(() => setOffset(0), [seenFilter, includeBots])

  const query = new URLSearchParams({
    limit: String(LIMIT),
    offset: String(offset),
    includeBots: String(includeBots),
  })
  const seenParam = SEEN_PARAM[seenFilter]
  if (seenParam !== null) query.set('seen', seenParam)
  const path = `${apiRoutes.admin.messages}?${query.toString()}`
  const { data, loading, error, setData } = useAdminResource<Paginated<MessageOut>>(
    request,
    path,
    isMessagePage
  )

  // Flip a message's seen state — splices the updated row in and refreshes the unread badge.
  async function toggleSeen(message: MessageOut) {
    setPendingId(message.id)
    setActionError(null)
    try {
      const updated = await request<MessageOut>(`${apiRoutes.admin.messages}/${message.id}`, {
        method: 'PATCH',
        body: { seen: !message.seen },
        validate: isMessageAdmin,
      })
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((m) => (m.id === updated.id ? updated : m)) } : prev
      )
      onSeenChange?.()
    } catch (err) {
      const status = err instanceof AdminApiError ? err.status : 0
      setActionError({
        id: message.id,
        message:
          status === 404 ? 'This message is gone. Reload the list.' : 'Could not save. Try again.',
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.select}>
          <span>Show</span>
          <SegmentedToggle
            value={seenFilter}
            options={SEEN_OPTIONS}
            ariaLabel="Filter by read status"
            onChange={onSeenFilterChange}
          />
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={includeBots}
            onChange={(event) => onIncludeBotsChange(event.target.checked)}
          />
          Include bot and spam
        </label>
      </div>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={(m) => m.id}
        loading={loading}
        error={error}
        emptyMessage="No messages."
        renderExpanded={(m) => (
          <MessageDetail
            message={m}
            onToggleSeen={toggleSeen}
            pending={pendingId === m.id}
            error={actionError?.id === m.id ? actionError.message : null}
          />
        )}
      />
      {data && data.total > 0 && (
        <Pagination offset={offset} limit={LIMIT} total={data.total} onOffsetChange={setOffset} />
      )}
    </div>
  )
}
