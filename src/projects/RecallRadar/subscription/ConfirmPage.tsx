import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../../components/PageFormatting/PageHeader'
import { apiRoutes, apiUrl } from '../../../api/api'
import { routePaths } from '../../../routes/routes.paths'
import styles from './SubscriptionPages.module.scss'

export function ConfirmPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'confirmed' | 'expired' | 'invalid'>('loading')
  const [manageToken, setManageToken] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(apiUrl(`${apiRoutes.subscriptions.confirm}?token=${encodeURIComponent(token)}`), {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json().catch(() => ({}))) as { management_token?: string }
          if (typeof body.management_token === 'string') setManageToken(body.management_token)
          setState('confirmed')
        } else if (res.status === 410) {
          setState('expired')
        } else {
          setState('invalid')
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState('invalid')
      })
    return () => controller.abort()
  }, [token])

  // No token to verify — send the visitor back to the dashboard rather than show a dead end.
  if (!token) return <Navigate to={routePaths.recallRadar} replace />

  const outcome = {
    confirmed: {
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
  }[state === 'loading' ? 'confirmed' : state]

  return (
    <PageLayout>
      <PageHeader title="Confirm subscription" />
      <div className={styles.outcome}>
        {state === 'loading' ? (
          <p className={styles.loading}>Confirming your subscription…</p>
        ) : (
          <>
            <span
              className={`${styles.mark} ${state === 'confirmed' ? styles.markOk : styles.markWarn}`}
              aria-hidden="true"
            >
              {outcome.mark}
            </span>
            <h2 className={styles.outcomeHeading}>{outcome.heading}</h2>
            <p className={styles.outcomeBody}>{outcome.body}</p>
            <div className={styles.outcomeActions}>
              {state === 'confirmed' && manageToken && (
                <Link
                  className={styles.cta}
                  to={`${routePaths.recallRadarManage}?token=${encodeURIComponent(manageToken)}`}
                >
                  Manage your alerts
                </Link>
              )}
              <Link className={styles.ctaSecondary} to={routePaths.recallRadar}>
                Go to Recall Radar
              </Link>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}
