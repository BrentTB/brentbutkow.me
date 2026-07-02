import { apiRoutes } from '../../../api/api'
import { useQueryParamsState } from '../../../routes/useQueryParamsState'
import { AdminTab, isAdminTab } from '../admin-tabs'
import {
  MessageSeenFilter,
  NullSpaceFilter,
  Overview,
  isMessageSeenFilter,
  isNullSpaceFilter,
  isOverview,
} from '../admin.types'
import { useAdminContext } from '../useAdminContext'
import { useAdminResource } from '../useAdminResource'
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

// Active tab + panel filters live in the URL so views are shareable and survive reload. Defaults are
// dropped from the query string, so /admin stays clean on the Overview and the Messages tab opens on
// its unread default with no `seen` param.
const PARAM_DEFAULTS = {
  tab: AdminTab.overview,
  score: NullSpaceFilter.all,
  seen: MessageSeenFilter.unread,
  bots: 'false',
}

export function AdminShell() {
  const { request, logout } = useAdminContext()
  const { values, patch } = useQueryParamsState(PARAM_DEFAULTS)

  // Actionable inbox count for the Messages tab badge — non-bot messages not yet marked seen.
  const { data: overview, reload: reloadOverview } = useAdminResource<Overview>(
    request,
    apiRoutes.admin.overview,
    isOverview
  )
  const unseen = overview?.messages.unseen ?? 0

  // URL params are untrusted strings — fall back to defaults on anything unexpected.
  const tab = isAdminTab(values.tab) ? values.tab : AdminTab.overview
  const scoreFilter = isNullSpaceFilter(values.score) ? values.score : NullSpaceFilter.all
  const seenFilter = isMessageSeenFilter(values.seen) ? values.seen : MessageSeenFilter.unread
  const includeBots = values.bots === 'true'

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
              {entry.id === AdminTab.messages && unseen > 0 && (
                <span className={styles.badge} aria-label={`${unseen} unread`}>
                  {unseen}
                </span>
              )}
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
        {tab === AdminTab.messages && (
          <MessagesPanel
            seenFilter={seenFilter}
            onSeenFilterChange={(next) => patch({ seen: next })}
            includeBots={includeBots}
            onIncludeBotsChange={(next) => patch({ bots: String(next) })}
            onSeenChange={reloadOverview}
          />
        )}
        {tab === AdminTab.subscriptions && <SubscriptionsPanel />}
        {tab === AdminTab.nullspace && (
          <NullSpacePanel filter={scoreFilter} onFilterChange={(next) => patch({ score: next })} />
        )}
      </div>
    </div>
  )
}
