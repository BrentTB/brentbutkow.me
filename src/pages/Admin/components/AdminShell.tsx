import { useState } from 'react'
import { useAdminContext } from '../useAdminContext'
import { MessagesPanel } from './MessagesPanel'
import { OverviewPanel } from './OverviewPanel'
import { SubscriptionsPanel } from './SubscriptionsPanel'
import styles from './AdminShell.module.scss'

const AdminTab = {
  overview: 'overview',
  messages: 'messages',
  subscriptions: 'subscriptions',
} as const
type AdminTab = (typeof AdminTab)[keyof typeof AdminTab]

const TABS: { id: AdminTab; label: string }[] = [
  { id: AdminTab.overview, label: 'Overview' },
  { id: AdminTab.messages, label: 'Messages' },
  { id: AdminTab.subscriptions, label: 'Subscriptions' },
]

export function AdminShell() {
  const { logout } = useAdminContext()
  const [tab, setTab] = useState<AdminTab>(AdminTab.overview)

  return (
    <div className={styles.shell}>
      <div className={styles.bar}>
        <nav className={styles.tabs} aria-label="Admin sections">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`${styles.tab} ${tab === entry.id ? styles.active : ''}`}
              aria-current={tab === entry.id ? 'page' : undefined}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </nav>
        <button type="button" className={styles.logout} onClick={logout}>
          Sign out
        </button>
      </div>

      <div className={styles.panel}>
        {tab === AdminTab.overview && <OverviewPanel />}
        {tab === AdminTab.messages && <MessagesPanel />}
        {tab === AdminTab.subscriptions && <SubscriptionsPanel />}
      </div>
    </div>
  )
}
