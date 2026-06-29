import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../../components/PageFormatting/PageHeader'
import { apiRoutes, apiUrl } from '../../../api/api'
import { routePaths } from '../../../routes/routes.paths'
import { OutcomeCard, OutcomeMark } from './OutcomeCard'
import styles from './SubscriptionPages.module.scss'

const UnsubscribeState = {
  loading: 'loading',
  unsubscribed: 'unsubscribed',
  already: 'already',
  invalid: 'invalid',
} as const
type UnsubscribeState = (typeof UnsubscribeState)[keyof typeof UnsubscribeState]

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<UnsubscribeState>(UnsubscribeState.loading)

  // One-click unsubscribe: the email link lands here and the request fires on mount.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(apiUrl(`${apiRoutes.subscriptions.unsubscribe}?token=${encodeURIComponent(token)}`), {
      method: 'POST',
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) setState(UnsubscribeState.unsubscribed)
        else if (res.status === 410) setState(UnsubscribeState.already)
        else setState(UnsubscribeState.invalid)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState(UnsubscribeState.invalid)
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
  }[state === UnsubscribeState.loading ? UnsubscribeState.unsubscribed : state]

  return (
    <PageLayout>
      <PageHeader title="Unsubscribe" />
      <OutcomeCard
        loading={state === UnsubscribeState.loading}
        loadingText="Unsubscribing…"
        mark={state === UnsubscribeState.invalid ? '⚠' : '✓'}
        markVariant={state === UnsubscribeState.invalid ? OutcomeMark.warn : OutcomeMark.ok}
        heading={outcome.heading}
        body={outcome.body}
      >
        <Link className={styles.cta} to={routePaths.recallRadar}>
          Go to Recall Radar
        </Link>
      </OutcomeCard>
    </PageLayout>
  )
}
