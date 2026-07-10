import type { MapTile } from './components/RecallMap'

// European tile-grid layout for the RASFF "affected countries" map. The skeleton follows the
// conventional Europe tile cartogram (Nordic peninsula with Estonia under Finland, Denmark floating
// between Britain and the mainland, Iberia in the bottom-left corner, a coherent Balkan mass) so a
// visitor finds a country where they expect it.
//
// The tile SET is data-driven, not political: every European country that actually occurs in
// RASFF's notifying/distribution data gets a tile — EU-27, EFTA, the UK, the microstates
// (Andorra alone has hundreds of affected recalls), and the Balkans/east (UA, MD, TR, the former
// Yugoslavia). Russia and Belarus are deliberately absent: a permanent zero tile reads as "no
// recalls affect this country" when the truth is "RASFF doesn't report it". North Macedonia is the
// one zero-count inclusion — every neighbour carries data, so its zero is informative.
// Non-European recipients (US, HK, AE, …) belong to the Top-affected-countries list, not a map.
//
// row/col are 1-indexed for CSS grid. Codes are ISO 3166-1 alpha-2 exactly as the backend emits
// them — Greece is GR (not Eurostat's EL), the UK is GB, Kosovo is XK.
export const EU_GRID_ROWS = 9
export const EU_GRID_COLS = 9

export const euCountryGrid: MapTile[] = [
  { code: 'IS', name: 'Iceland', row: 1, col: 1 },
  { code: 'NO', name: 'Norway', row: 1, col: 5 },
  { code: 'SE', name: 'Sweden', row: 1, col: 6 },
  { code: 'FI', name: 'Finland', row: 1, col: 7 },
  { code: 'EE', name: 'Estonia', row: 2, col: 7 },
  { code: 'IE', name: 'Ireland', row: 3, col: 1 },
  { code: 'GB', name: 'United Kingdom', row: 3, col: 2 },
  { code: 'DK', name: 'Denmark', row: 3, col: 5 },
  { code: 'LV', name: 'Latvia', row: 3, col: 7 },
  { code: 'BE', name: 'Belgium', row: 4, col: 3 },
  { code: 'NL', name: 'Netherlands', row: 4, col: 4 },
  { code: 'DE', name: 'Germany', row: 4, col: 5 },
  { code: 'PL', name: 'Poland', row: 4, col: 6 },
  { code: 'LT', name: 'Lithuania', row: 4, col: 7 },
  { code: 'FR', name: 'France', row: 5, col: 2 },
  { code: 'LU', name: 'Luxembourg', row: 5, col: 3 },
  { code: 'CH', name: 'Switzerland', row: 5, col: 4 },
  { code: 'LI', name: 'Liechtenstein', row: 5, col: 5 },
  { code: 'CZ', name: 'Czechia', row: 5, col: 6 },
  { code: 'SK', name: 'Slovakia', row: 5, col: 7 },
  { code: 'UA', name: 'Ukraine', row: 5, col: 8 },
  { code: 'PT', name: 'Portugal', row: 6, col: 1 },
  { code: 'ES', name: 'Spain', row: 6, col: 2 },
  { code: 'AD', name: 'Andorra', row: 6, col: 3 },
  { code: 'IT', name: 'Italy', row: 6, col: 4 },
  { code: 'AT', name: 'Austria', row: 6, col: 5 },
  { code: 'HU', name: 'Hungary', row: 6, col: 6 },
  { code: 'RO', name: 'Romania', row: 6, col: 7 },
  { code: 'MD', name: 'Moldova', row: 6, col: 8 },
  { code: 'MC', name: 'Monaco', row: 7, col: 2 },
  { code: 'SM', name: 'San Marino', row: 7, col: 3 },
  { code: 'SI', name: 'Slovenia', row: 7, col: 4 },
  { code: 'HR', name: 'Croatia', row: 7, col: 5 },
  { code: 'BA', name: 'Bosnia and Herzegovina', row: 7, col: 6 },
  { code: 'RS', name: 'Serbia', row: 7, col: 7 },
  { code: 'BG', name: 'Bulgaria', row: 7, col: 8 },
  { code: 'TR', name: 'Türkiye', row: 7, col: 9 },
  { code: 'ME', name: 'Montenegro', row: 8, col: 6 },
  { code: 'XK', name: 'Kosovo', row: 8, col: 7 },
  { code: 'MK', name: 'North Macedonia', row: 8, col: 8 },
  { code: 'CY', name: 'Cyprus', row: 8, col: 9 },
  { code: 'MT', name: 'Malta', row: 9, col: 4 },
  { code: 'AL', name: 'Albania', row: 9, col: 6 },
  { code: 'GR', name: 'Greece', row: 9, col: 7 },
]
