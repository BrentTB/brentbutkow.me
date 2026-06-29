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

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(apiUrl(`${apiRoutes.subscriptions.confirm}?token=${encodeURIComponent(token)}`), {
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) setState('confirmed')
        else if (res.status === 410) setState('expired')
        else setState('invalid')
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState('invalid')
      })
    return () => controller.abort()
  }, [token])

  // No token to verify — send the visitor back to the dashboard rather than show a dead end.
  if (!token) return <Navigate to={routePaths.recallRadar} replace />

  return (
    <PageLayout>
      <PageHeader title="Confirm subscription" showBackButton />
      <div className={styles.message}>
        {state === 'loading' && <p>Confirming your subscription…</p>}
        {state === 'confirmed' && (
          <p>
            Your subscription is confirmed. You’ll receive alerts when matching recalls are found.
          </p>
        )}
        {state === 'expired' && (
          <>
            <p>
              This confirmation link has expired (links are valid for 72 hours). Please subscribe
              again.
            </p>
            <Link className={styles.link} to={routePaths.recallRadar}>
              Back to Recall Radar
            </Link>
          </>
        )}
        {state === 'invalid' && (
          <>
            <p>This link is invalid or has already been used.</p>
            <Link className={styles.link} to={routePaths.recallRadar}>
              Back to Recall Radar
            </Link>
          </>
        )}
      </div>
    </PageLayout>
  )
}
