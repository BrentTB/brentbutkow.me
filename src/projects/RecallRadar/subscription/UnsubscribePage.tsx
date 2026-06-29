import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../../components/PageFormatting/PageHeader'
import { apiRoutes, apiUrl } from '../../../api/api'
import { routePaths } from '../../../routes/routes.paths'
import styles from './SubscriptionPages.module.scss'

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'unsubscribed' | 'already' | 'invalid'>('loading')

  // One-click unsubscribe: the email link lands here and the request fires on mount.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(apiUrl(`${apiRoutes.subscriptions.unsubscribe}?token=${encodeURIComponent(token)}`), {
      method: 'POST',
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) setState('unsubscribed')
        else if (res.status === 410) setState('already')
        else setState('invalid')
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState('invalid')
      })
    return () => controller.abort()
  }, [token])

  if (!token) return <Navigate to={routePaths.recallRadar} replace />

  const outcome = {
    unsubscribed: {
      heading: 'You’re unsubscribed',
      body: 'You won’t get any more recall alerts. You can subscribe again any time from Recall Radar.',
    },
    already: {
      heading: 'Already unsubscribed',
      body: 'This subscription was already cancelled.',
    },
    invalid: {
      heading: 'This link isn’t valid',
      body: 'It may be invalid or already used.',
    },
  }[state === 'loading' ? 'unsubscribed' : state]

  return (
    <PageLayout>
      <PageHeader title="Unsubscribe" />
      <div className={styles.outcome}>
        {state === 'loading' ? (
          <p className={styles.loading}>Unsubscribing…</p>
        ) : (
          <>
            <span
              className={`${styles.mark} ${state === 'invalid' ? styles.markWarn : styles.markOk}`}
              aria-hidden="true"
            >
              {state === 'invalid' ? '⚠' : '✓'}
            </span>
            <h2 className={styles.outcomeHeading}>{outcome.heading}</h2>
            <p className={styles.outcomeBody}>{outcome.body}</p>
            <Link className={styles.cta} to={routePaths.recallRadar}>
              Go to Recall Radar
            </Link>
          </>
        )}
      </div>
    </PageLayout>
  )
}
