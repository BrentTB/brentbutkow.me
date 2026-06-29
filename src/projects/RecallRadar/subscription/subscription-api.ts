import type { RecallCategory, RecallCountry, SeverityLabel } from '../recall.types'
import type { FilterFieldsValue } from './SubscriptionFields'

// Confirmation and management tokens go in this header, not the query string, so they stay out of
// access logs / browser history / Referer. The token still arrives via the email-link URL once; the
// page reads it, forwards it here, and strips it from the address bar.
export const SUBSCRIPTION_TOKEN_HEADER = 'X-Subscription-Token'

// The subscription API uses camelCase (like the rest of the backend) and null for "unset". This
// shape is the wire payload shared by the subscribe (POST) and manage (PATCH) endpoints.
export type FilterPayload = {
  countries: RecallCountry[]
  entities: string[]
  companies: string[]
  categories: RecallCategory[]
  minSeverity: SeverityLabel | null
}

export function filtersToPayload(value: FilterFieldsValue): FilterPayload {
  return {
    countries: value.countries,
    entities: value.entities,
    companies: value.companies,
    categories: value.categories,
    minSeverity: value.minSeverity || null,
  }
}

// Maps API field names onto the form's value keys, so a Pydantic 422 lands on the right input. The
// subscribe form extends this with its own `email` key.
export const FILTER_FIELD_MAP: Record<string, keyof FilterFieldsValue> = {
  countries: 'countries',
  entities: 'entities',
  companies: 'companies',
  categories: 'categories',
  minSeverity: 'minSeverity',
}

export type ValidationErrors<K extends string> = {
  fields: Partial<Record<K, string>>
  general: string | null
}

// FastAPI 422s come in two shapes: our service returns {detail: "<message>"}, while Pydantic returns
// {detail: [{loc, msg}]}. Map the latter onto field names via `fieldMap`; surface the former as a
// general message. An unparseable body yields empty errors so the caller can fall back to a generic.
export async function parseValidationErrors<K extends string>(
  res: Response,
  fieldMap: Record<string, K>
): Promise<ValidationErrors<K>> {
  try {
    const body = (await res.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return { fields: {}, general: body.detail }
    if (Array.isArray(body.detail)) {
      const fields: Partial<Record<K, string>> = {}
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
    // fall through to a generic result
  }
  return { fields: {}, general: null }
}
