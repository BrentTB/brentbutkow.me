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

// Null Space score-table filter. UI-only: maps to the `flagged` query param (all omits it). The
// values double as the dropdown + `?score=` query-param values — no magic strings.
export const NullSpaceFilter = {
  all: 'all',
  flagged: 'flagged',
  legit: 'legit',
} as const
export type NullSpaceFilter = (typeof NullSpaceFilter)[keyof typeof NullSpaceFilter]

export function isNullSpaceFilter(value: string): value is NullSpaceFilter {
  return (Object.values(NullSpaceFilter) as string[]).includes(value)
}

// Messages read/unread filter. UI-only tri-state that maps to the `seen` query param (all omits it).
// Values double as the segmented-toggle + query-mapping keys — no magic strings.
export const MessageSeenFilter = {
  all: 'all',
  unread: 'unread',
  read: 'read',
} as const
export type MessageSeenFilter = (typeof MessageSeenFilter)[keyof typeof MessageSeenFilter]

export function isMessageSeenFilter(value: string): value is MessageSeenFilter {
  return (Object.values(MessageSeenFilter) as string[]).includes(value)
}

export type AdminSession = {
  token: string
  expiresAt: string // ISO-8601
}

export type Paginated<T> = {
  items: T[]
  total: number
}

export type Overview = {
  // `unseen` = real (non-bot) messages not yet marked seen — the actionable inbox count (≤ real).
  messages: { total: number; real: number; bot: number; unseen: number }
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
  nullspace: { total: number; legit: number; flagged: number }
}

export type MessageOut = {
  id: number
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
  seen: boolean
}

export type ScoreAdminOut = {
  id: string
  createdAt: string
  name: string
  score: number
  kills: number
  wave: number
  level: number
  durationMs: number
  shipKind: string
  version: string
  currency: number
  spaceMetal: number
  upgradesPurchased: number
  ultimatesOwned: number
  ipAddress: string | null
  flagged: boolean
  flagReason: string | null
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

// Every listed key is present and numeric on `value`.
function hasNumbers(value: unknown, keys: readonly string[]): boolean {
  return isObject(value) && keys.every((key) => typeof value[key] === 'number')
}

// Light structural checks — enough to reject a malformed/foreign payload before render.
// The backend is trusted; these guard against shape drift, not adversarial input.
export function isAdminSession(value: unknown): value is AdminSession {
  return isObject(value) && typeof value.token === 'string' && typeof value.expiresAt === 'string'
}

export function isOverview(value: unknown): value is Overview {
  if (!isObject(value)) return false
  // `ingest` is null until the first run; when present it carries fetched/upserted counts.
  const ingestOk =
    value.ingest === null || hasNumbers(value.ingest, ['fetchedCount', 'upsertedCount'])
  return (
    ingestOk &&
    hasNumbers(value.messages, ['total', 'real', 'bot', 'unseen']) &&
    hasNumbers(value.subscriptions, [
      'total',
      'active',
      'pendingConfirmation',
      'paused',
      'unsubscribed',
    ]) &&
    hasNumbers(value.recalls, ['total', 'us', 'uk', 'za']) &&
    hasNumbers(value.nullspace, ['total', 'legit', 'flagged'])
  )
}

// All three admin lists share the { items, total } envelope; one guard covers them.
function isPaginated(value: unknown): value is Paginated<unknown> {
  return isObject(value) && Array.isArray(value.items) && typeof value.total === 'number'
}

export function isMessagePage(value: unknown): value is Paginated<MessageOut> {
  return isPaginated(value)
}

// Single message — the shape a seen-toggle PATCH returns. Same light structural check as the lists.
export function isMessageAdmin(value: unknown): value is MessageOut {
  return isObject(value) && typeof value.id === 'number' && typeof value.seen === 'boolean'
}

export function isSubscriptionPage(value: unknown): value is Paginated<SubscriptionAdminOut> {
  return isPaginated(value)
}

// Single subscription — the shape a PATCH returns. Same light structural check as the lists.
export function isSubscriptionAdmin(value: unknown): value is SubscriptionAdminOut {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.status === 'string'
  )
}

export function isScorePage(value: unknown): value is Paginated<ScoreAdminOut> {
  return isPaginated(value)
}
