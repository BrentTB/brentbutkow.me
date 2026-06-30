import { useQueryParamsState } from '../../../routes/useQueryParamsState'
import { AdminTab, isAdminTab } from '../admin-tabs'
import { NullSpaceFilter, isNullSpaceFilter } from '../admin.types'
import { useAdminContext } from '../useAdminContext'
import { MessagesPanel } from './MessagesPanel'
import { NullSpacePanel } from './NullSpacePanel'
import { OverviewPanel } from './OverviewPanel'
import { SubscriptionsPanel } from './SubscriptionsPanel'
import styles from './AdminShell.module.scss'

const TABS: { id: AdminTab; label: string }[] = [
  { id: AdminTab.overview, label: 'Overview' },
  { id: AdminTab.messages, label: 'Messages' },
  { id: AdminTab.subscriptions, label: 'Subscriptions' },
  { id: AdminTab.nullspace, label: 'Null Space' },
]

// Active tab + Null Space score filter live in the URL so views are shareable and survive reload.
// Defaults are dropped from the query string, so /admin stays clean on the Overview.
const PARAM_DEFAULTS = { tab: AdminTab.overview, score: NullSpaceFilter.all }

export function AdminShell() {
  const { logout } = useAdminContext()
  const { values, patch } = useQueryParamsState(PARAM_DEFAULTS)

  // URL params are untrusted strings — fall back to defaults on anything unexpected.
  const tab = isAdminTab(values.tab) ? values.tab : AdminTab.overview
  const scoreFilter = isNullSpaceFilter(values.score) ? values.score : NullSpaceFilter.all

  const openTab = (next: AdminTab) => patch({ tab: next })
  const inspectFlaggedScores = () =>
    patch({ tab: AdminTab.nullspace, score: NullSpaceFilter.flagged })

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
              onClick={() => openTab(entry.id)}
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
        {tab === AdminTab.overview && (
          <OverviewPanel onOpenTab={openTab} onInspectFlaggedScores={inspectFlaggedScores} />
        )}
        {tab === AdminTab.messages && <MessagesPanel />}
        {tab === AdminTab.subscriptions && <SubscriptionsPanel />}
        {tab === AdminTab.nullspace && (
          <NullSpacePanel filter={scoreFilter} onFilterChange={(next) => patch({ score: next })} />
        )}
      </div>
    </div>
  )
}
