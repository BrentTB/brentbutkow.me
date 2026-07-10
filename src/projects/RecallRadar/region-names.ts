// ISO 3166-1 alpha-2 → English display name ("IE" → "Ireland") via the browser's own region
// table, so the EU geography fields need no hand-rolled country list. Unknown or malformed codes
// fall back to the raw code — the UI degrades to "XK" rather than crashing.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

export function regionName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}
