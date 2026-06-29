import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PageLayout } from '../../../components/PageFormatting/PageLayout'
import { apiRoutes, apiUrl } from '../../../api/api'
import { routePaths } from '../../../routes/routes.paths'
import { OutcomeCard, OutcomeMark } from './OutcomeCard'
import { SUBSCRIPTION_TOKEN_HEADER } from './subscription-api'
import { useStripTokenFromUrl } from './useStripTokenFromUrl'
import styles from './SubscriptionPages.module.scss'

const ConfirmState = {
  loading: 'loading',
  confirmed: 'confirmed',
  expired: 'expired',
  invalid: 'invalid',
} as const
type ConfirmState = (typeof ConfirmState)[keyof typeof ConfirmState]

export function ConfirmPage() {
  const token = useStripTokenFromUrl()
  const [state, setState] = useState<ConfirmState>(ConfirmState.loading)
  const [manageToken, setManageToken] = useState<string | null>(null)
  // The same endpoint confirms an initial opt-in or a preference change; `updated` tells them apart.
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(apiUrl(apiRoutes.subscriptions.confirm), {
      headers: { [SUBSCRIPTION_TOKEN_HEADER]: token },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            managementToken?: string
            updated?: boolean
          }
          if (typeof body.managementToken === 'string') setManageToken(body.managementToken)
          setUpdated(body.updated === true)
          setState(ConfirmState.confirmed)
        } else if (res.status === 410) {
          setState(ConfirmState.expired)
        } else {
          setState(ConfirmState.invalid)
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState(ConfirmState.invalid)
      })
    return () => controller.abort()
  }, [token])

  // No token to verify — send the visitor back to the dashboard rather than show a dead end.
  if (!token) return <Navigate to={routePaths.recallRadar} replace />

  const outcome = {
    confirmed: updated
      ? {
          mark: '✓',
          heading: 'Preferences updated',
          body: 'Your alert filters are now in effect. You’ll get emails based on the new criteria.',
        }
      : {
          mark: '✓',
          heading: 'You’re subscribed',
          body: 'You’ll get an email whenever new recalls match the filters you chose.',
        },
    expired: {
      mark: '⏱',
      heading: 'This link has expired',
      body: 'Confirmation links are valid for 72 hours. Head back and subscribe again.',
    },
    invalid: {
      mark: '⚠',
      heading: 'This link isn’t valid',
      body: 'It may be invalid or already used. Head back and subscribe again.',
    },
  }[state === ConfirmState.loading ? ConfirmState.confirmed : state]

  return (
    <PageLayout>
      <div className={styles.message}>
        <h1 className={styles.title}>Confirm subscription</h1>
        <OutcomeCard
          loading={state === ConfirmState.loading}
          loadingText="Confirming your subscription…"
          mark={outcome.mark}
          markVariant={state === ConfirmState.confirmed ? OutcomeMark.ok : OutcomeMark.warn}
          heading={outcome.heading}
          body={outcome.body}
        >
          <Link className={styles.cta} to={routePaths.recallRadar}>
            Go to Recall Radar
          </Link>
          {state === ConfirmState.confirmed && manageToken && (
            <Link
              className={styles.ctaSecondary}
              to={`${routePaths.recallRadarManage}?token=${encodeURIComponent(manageToken)}`}
            >
              Manage your alerts
            </Link>
          )}
        </OutcomeCard>
      </div>
    </PageLayout>
  )
}
