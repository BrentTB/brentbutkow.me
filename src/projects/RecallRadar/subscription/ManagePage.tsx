import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../../components/PageFormatting/PageHeader'
import { apiRoutes, apiUrl } from '../../../api/api'
import { routePaths } from '../../../routes/routes.paths'
import { RecallCategory, RecallCountry, type SeverityLabel } from '../recall.types'
import {
  SUBSCRIPTION_DISCLAIMER,
  SubscriptionFields,
  type FilterFieldsValue,
} from './SubscriptionFields'
import styles from './SubscriptionPages.module.scss'

const EMPTY: FilterFieldsValue = {
  countries: [],
  entities: [],
  companies: [],
  categories: [],
  minSeverity: '',
}

const manageUrl = (token: string) =>
  apiUrl(`${apiRoutes.subscriptions.manage}?token=${encodeURIComponent(token)}`)

// The manage API speaks snake_case and uses null for "unset"; map it onto the form's value shape.
function toFields(body: Record<string, unknown>): FilterFieldsValue {
  const asArray = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
  return {
    countries: asArray(body.countries) as RecallCountry[],
    entities: asArray(body.entities),
    companies: asArray(body.companies),
    categories: asArray(body.categories) as RecallCategory[],
    minSeverity: typeof body.min_severity === 'string' ? (body.min_severity as SeverityLabel) : '',
  }
}

function toPayload(value: FilterFieldsValue) {
  return {
    countries: value.countries,
    entities: value.entities,
    companies: value.companies,
    categories: value.categories,
    min_severity: value.minSeverity || null,
  }
}

export function ManagePage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'unsubscribed' | 'notfound'>(
    token ? 'loading' : 'notfound'
  )
  const [value, setValue] = useState<FilterFieldsValue>(EMPTY)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FilterFieldsValue, string>>>(
    {}
  )
  const [message, setMessage] = useState<string | null>(null)

  const setField = useCallback(
    <K extends keyof FilterFieldsValue>(key: K, fieldValue: FilterFieldsValue[K]) => {
      setValue((prev) => ({ ...prev, [key]: fieldValue }))
      setSaveState('idle')
    },
    []
  )

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    fetch(manageUrl(token), { signal: controller.signal })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as Record<string, unknown>
          setValue(toFields(body))
          setLoadState('ready')
        } else if (res.status === 410) {
          setLoadState('unsubscribed')
        } else {
          setLoadState('notfound')
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setLoadState('notfound')
      })
    return () => controller.abort()
  }, [token])

  const save = async () => {
    if (!token) return
    setSaveState('saving')
    setFieldErrors({})
    setMessage(null)
    try {
      const res = await fetch(manageUrl(token), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(value)),
      })
      if (res.ok) {
        setSaveState('saved')
        setMessage('Preferences saved.')
      } else if (res.status === 422) {
        const { fields, general } = await parseValidationError(res)
        setFieldErrors(fields)
        setSaveState('error')
        setMessage(general ?? 'Please keep at least one filter.')
      } else {
        setSaveState('error')
        setMessage('Couldn’t save your preferences. Please try again.')
      }
    } catch {
      setSaveState('error')
      setMessage('Couldn’t save your preferences. Please try again.')
    }
  }

  const unsubscribe = async () => {
    if (!token) return
    setMessage(null)
    try {
      const res = await fetch(
        apiUrl(`${apiRoutes.subscriptions.unsubscribe}?token=${encodeURIComponent(token)}`),
        { method: 'POST' }
      )
      if (res.ok) {
        setLoadState('unsubscribed')
        setMessage('You have been unsubscribed.')
      } else if (res.status === 410) {
        setLoadState('unsubscribed')
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
      <PageHeader title="Manage alerts" showBackButton />
      <div className={styles.message}>
        {loadState === 'loading' && <p>Loading your preferences…</p>}

        {loadState === 'unsubscribed' && <p>{message ?? 'You are already unsubscribed.'}</p>}

        {loadState === 'notfound' && (
          <>
            <p>This link is invalid or could not be found.</p>
            <Link className={styles.link} to={routePaths.recallRadar}>
              Back to Recall Radar
            </Link>
          </>
        )}

        {loadState === 'ready' && (
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
              <p className={saveState === 'error' ? styles.error : styles.success} role="status">
                {message}
              </p>
            )}

            <p className={styles.disclaimer}>{SUBSCRIPTION_DISCLAIMER}</p>

            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? 'Saving…' : 'Save preferences'}
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

// FastAPI 422s come in two shapes: our service returns {detail: "<message>"}, while Pydantic
// returns {detail: [{loc, msg}]}. Map the latter onto field names; surface the former as-is.
async function parseValidationError(
  res: Response
): Promise<{ fields: Partial<Record<keyof FilterFieldsValue, string>>; general: string | null }> {
  const fieldMap: Record<string, keyof FilterFieldsValue> = {
    countries: 'countries',
    entities: 'entities',
    companies: 'companies',
    categories: 'categories',
    min_severity: 'minSeverity',
  }
  try {
    const body = (await res.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return { fields: {}, general: body.detail }
    if (Array.isArray(body.detail)) {
      const fields: Partial<Record<keyof FilterFieldsValue, string>> = {}
      for (const item of body.detail as Array<{ loc?: unknown; msg?: string }>) {
        const loc = item.loc
        if (Array.isArray(loc) && loc.length >= 2) {
          const key = fieldMap[String(loc[loc.length - 1])]
          if (key && item.msg) fields[key] = item.msg
        }
      }
      return { fields, general: null }
    }
  } catch {
    // fall through to a generic message
  }
  return { fields: {}, general: null }
}
