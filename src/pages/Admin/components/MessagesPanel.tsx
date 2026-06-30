import { useState } from 'react'
import { apiRoutes } from '../../../api/api'
import { MessageOut, Paginated, isMessagePage } from '../admin.types'
import { formatDateTime } from '../admin-format'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
import { Column, DataTable } from './DataTable'
import { Pagination } from './Pagination'
import styles from './Panel.module.scss'

const LIMIT = 50

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
    key: 'bot',
    header: 'Bot',
    render: (m) =>
      m.isBot ? <span className={styles.flag}>{m.botReason || 'flagged'}</span> : '—',
  },
]

function MessageDetail({ message }: { message: MessageOut }) {
  const fields: { label: string; value: string | null }[] = [
    { label: 'Timezone', value: message.timezone },
    { label: 'Locale', value: message.locale },
    { label: 'Accept-Language', value: message.acceptLanguage },
    { label: 'Referrer', value: message.referrer },
    { label: 'IP address', value: message.ipAddress },
    { label: 'User agent', value: message.userAgent },
  ]
  return (
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
  )
}

export function MessagesPanel() {
  const { request } = useAdminContext()
  const [includeBots, setIncludeBots] = useState(false)
  const [offset, setOffset] = useState(0)

  const query = new URLSearchParams({
    limit: String(LIMIT),
    offset: String(offset),
    includeBots: String(includeBots),
  })
  const path = `${apiRoutes.admin.messages}?${query.toString()}`
  const { data, loading, error } = useAdminResource<Paginated<MessageOut>>(
    request,
    path,
    isMessagePage
  )

  return (
    <div>
      <div className={styles.toolbar}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={includeBots}
            onChange={(event) => {
              setIncludeBots(event.target.checked)
              setOffset(0)
            }}
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
        renderExpanded={(m) => <MessageDetail message={m} />}
      />
      {data && data.total > 0 && (
        <Pagination offset={offset} limit={LIMIT} total={data.total} onOffsetChange={setOffset} />
      )}
    </div>
  )
}
