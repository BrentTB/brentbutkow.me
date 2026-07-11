import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../../../components/PageFormatting/PageLayout'
import { apiRoutes, apiUrl } from '../../../api/api'
import { routePaths } from '../../../routes/routes.paths'
import { isRecallCategory, isRecallCountry, isSeverityLabel } from '../recall.types'
import {
  SUBSCRIPTION_DISCLAIMER,
  SubscriptionFields,
  type FilterFieldsValue,
} from './SubscriptionFields'
import { OutcomeCard, OutcomeMark } from './OutcomeCard'
import {
  FILTER_FIELD_MAP,
  SUBSCRIPTION_TOKEN_HEADER,
  filtersToPayload,
  parseValidationErrors,
} from './subscription-api'
import { useStripTokenFromUrl } from './useStripTokenFromUrl'
import styles from './SubscriptionPages.module.scss'

const LoadState = {
  loading: 'loading',
  ready: 'ready',
  unsubscribed: 'unsubscribed',
  notfound: 'notfound',
} as const
type LoadState = (typeof LoadState)[keyof typeof LoadState]

const SaveState = { idle: 'idle', saving: 'saving', saved: 'saved', error: 'error' } as const
type SaveState = (typeof SaveState)[keyof typeof SaveState]

const EMPTY: FilterFieldsValue = {
  countries: [],
  affectedCountries: [],
  entities: [],
  companies: [],
  categories: [],
  minSeverity: '',
}

const MANAGE_URL = apiUrl(apiRoutes.subscriptions.manage)
const UNSUBSCRIBE_URL = apiUrl(apiRoutes.subscriptions.unsubscribe)

// The manage API uses camelCase and null for "unset". Validate each field against the same guards
// the dashboard uses, so a stale or garbage value can't flow into form state and back out.
function toFields(body: Record<string, unknown>): FilterFieldsValue {
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []
  return {
    countries: strings(body.countries).filter(isRecallCountry),
    affectedCountries: strings(body.affectedCountries),
    entities: strings(body.entities),
    companies: strings(body.companies),
    categories: strings(body.categories).filter(isRecallCategory),
    minSeverity: isSeverityLabel(body.minSeverity) ? body.minSeverity : '',
  }
}

export function ManagePage() {
  const token = useStripTokenFromUrl()

  const [loadState, setLoadState] = useState<LoadState>(
    token ? LoadState.loading : LoadState.notfound
  )
  const [value, setValue] = useState<FilterFieldsValue>(EMPTY)
  const [email, setEmail] = useState('')
  const [saveState, setSaveState] = useState<SaveState>(SaveState.idle)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FilterFieldsValue, string>>>(
    {}
  )
  const [message, setMessage] = useState<string | null>(null)

  const setField = useCallback(
    <K extends keyof FilterFieldsValue>(key: K, fieldValue: FilterFieldsValue[K]) => {
      setValue((prev) => ({ ...prev, [key]: fieldValue }))
      setSaveState(SaveState.idle)
    },
    []
  )

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(MANAGE_URL, {
      headers: { [SUBSCRIPTION_TOKEN_HEADER]: token },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
          setValue(toFields(body))
          if (typeof body.email === 'string') setEmail(body.email)
          setLoadState(LoadState.ready)
        } else if (res.status === 410) {
          setLoadState(LoadState.unsubscribed)
        } else {
          setLoadState(LoadState.notfound)
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setLoadState(LoadState.notfound)
      })
    return () => controller.abort()
  }, [token])

  const save = async () => {
    if (!token) return
    setSaveState(SaveState.saving)
    setFieldErrors({})
    setMessage(null)
    try {
      const res = await fetch(MANAGE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          [SUBSCRIPTION_TOKEN_HEADER]: token,
        },
        body: JSON.stringify(filtersToPayload(value)),
      })
      if (res.ok) {
        setSaveState(SaveState.saved)
        setMessage('Preferences saved.')
      } else if (res.status === 422) {
        const { fields, general } = await parseValidationErrors(res, FILTER_FIELD_MAP)
        setFieldErrors(fields)
        setSaveState(SaveState.error)
        setMessage(general ?? 'Please check your selections and try again.')
      } else {
        setSaveState(SaveState.error)
        setMessage('Couldn’t save your preferences. Please try again.')
      }
    } catch {
      setSaveState(SaveState.error)
      setMessage('Couldn’t save your preferences. Please try again.')
    }
  }

  const unsubscribe = async () => {
    if (!token) return
    setMessage(null)
    try {
      const res = await fetch(UNSUBSCRIBE_URL, {
        method: 'POST',
        headers: { [SUBSCRIPTION_TOKEN_HEADER]: token },
      })
      if (res.ok) {
        setLoadState(LoadState.unsubscribed)
        setMessage('You have been unsubscribed.')
      } else if (res.status === 410) {
        setLoadState(LoadState.unsubscribed)
        setMessage('Already unsubscribed.')
      } else {
        setMessage('Couldn’t unsubscribe. Please try again.')
      }
    } catch {
      setMessage('Couldn’t unsubscribe. Please try again.')
    }
  }

  return (
    <PageLayout>
      <div className={styles.message}>
        <h1 className={styles.title}>Manage alerts</h1>
        {loadState === LoadState.ready && email && <p className={styles.subEmail}>{email}</p>}

        {loadState === LoadState.loading && <p>Loading your preferences…</p>}

        {loadState === LoadState.unsubscribed && (
          <OutcomeCard
            loading={false}
            mark="✓"
            markVariant={OutcomeMark.ok}
            heading="You’re unsubscribed"
            body="You won’t get any more recall alerts. Subscribe again any time from Recall Radar."
          >
            <Link className={styles.cta} to={routePaths.recallRadar}>
              Go to Recall Radar
            </Link>
          </OutcomeCard>
        )}

        {loadState === LoadState.notfound && (
          <OutcomeCard
            loading={false}
            mark="⚠"
            markVariant={OutcomeMark.warn}
            heading="Link not found"
            body="This link is invalid or could not be found."
          >
            <Link className={styles.cta} to={routePaths.recallRadar}>
              Go to Recall Radar
            </Link>
          </OutcomeCard>
        )}

        {loadState === LoadState.ready && (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
            noValidate
          >
            <SubscriptionFields value={value} setField={setField} errors={fieldErrors} />

            {message && (
              <p
                className={saveState === SaveState.error ? styles.error : styles.success}
                role="status"
              >
                {message}
              </p>
            )}

            <p className={styles.disclaimer}>{SUBSCRIPTION_DISCLAIMER}</p>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primary}
                disabled={saveState === SaveState.saving}
              >
                {saveState === SaveState.saving ? 'Saving…' : 'Save preferences'}
              </button>
              <button type="button" className={styles.secondary} onClick={() => void unsubscribe()}>
                Unsubscribe
              </button>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  )
}
