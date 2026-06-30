// Subscription lifecycle states as the backend reports them. Values double as the
// runtime identifiers (filter values, table labels) — no magic strings.
export const SubscriptionAdminStatus = {
  pendingConfirmation: 'pending_confirmation',
  active: 'active',
  paused: 'paused',
  unsubscribed: 'unsubscribed',
} as const
export type SubscriptionAdminStatus =
  (typeof SubscriptionAdminStatus)[keyof typeof SubscriptionAdminStatus]

export type AdminSession = {
  token: string
  expiresAt: string // ISO-8601
}

export type Paginated<T> = {
  items: T[]
  total: number
}

export type Overview = {
  messages: { total: number; real: number; bot: number }
  subscriptions: {
    total: number
    active: number
    pendingConfirmation: number
    paused: number
    unsubscribed: number
  }
  ingest: {
    lastRunAt: string
    status: string
    fetchedCount: number
    upsertedCount: number
  } | null
  recalls: { total: number; us: number; uk: number; za: number }
  nullspace: { scoreCount: number }
}

export type MessageOut = {
  id: string
  createdAt: string
  message: string
  name: string | null
  email: string | null
  timezone: string | null
  locale: string | null
  referrer: string | null
  userAgent: string | null
  acceptLanguage: string | null
  ipAddress: string | null
  country: string | null
  isBot: boolean
  botReason: string | null
}

export type SubscriptionAdminOut = {
  id: string
  email: string
  status: SubscriptionAdminStatus
  countries: string[]
  entities: string[]
  companies: string[]
  categories: string[]
  minSeverity: string | null
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
  lastDigestAt: string | null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Light structural checks — enough to reject a malformed/foreign payload before render.
// The backend is trusted; these guard against shape drift, not adversarial input.
export function isAdminSession(value: unknown): value is AdminSession {
  return isObject(value) && typeof value.token === 'string' && typeof value.expiresAt === 'string'
}

export function isOverview(value: unknown): value is Overview {
  return (
    isObject(value) &&
    isObject(value.messages) &&
    isObject(value.subscriptions) &&
    isObject(value.recalls) &&
    isObject(value.nullspace)
  )
}

export function isMessagePage(value: unknown): value is Paginated<MessageOut> {
  return isObject(value) && Array.isArray(value.items) && typeof value.total === 'number'
}

export function isSubscriptionPage(value: unknown): value is Paginated<SubscriptionAdminOut> {
  return isObject(value) && Array.isArray(value.items) && typeof value.total === 'number'
}
