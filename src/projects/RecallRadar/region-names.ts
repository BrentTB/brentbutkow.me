// ISO 3166-1 alpha-2 → English display name ("IE" → "Ireland") via the browser's own region
// table, so the EU geography fields need no hand-rolled country list. Malformed codes throw
// inside Intl and fall back to the raw code; well-formed-but-unassigned codes (e.g. "ZZ") render
// Intl's own "Unknown Region" label. Either way the UI degrades instead of crashing.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

export function regionName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}
