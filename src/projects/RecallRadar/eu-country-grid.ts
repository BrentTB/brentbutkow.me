import type { MapTile } from './components/RecallMap'

// EU tile-grid layout: the EU-27 plus the EFTA countries and the UK, which appear in RASFF's
// notifying/distribution data. row/col are 1-indexed for CSS grid, arranged as a compact
// cartogram (every country gets an equal tile, roughly in its geographic position). Codes are
// ISO 3166-1 alpha-2 exactly as the backend emits them — Greece is GR (not Eurostat's EL), the
// UK is GB.
export const EU_GRID_ROWS = 8
export const EU_GRID_COLS = 7

export const euCountryGrid: MapTile[] = [
  { code: 'IS', name: 'Iceland', row: 1, col: 1 },
  { code: 'NO', name: 'Norway', row: 1, col: 4 },
  { code: 'SE', name: 'Sweden', row: 1, col: 5 },
  { code: 'FI', name: 'Finland', row: 1, col: 6 },
  { code: 'IE', name: 'Ireland', row: 2, col: 1 },
  { code: 'GB', name: 'United Kingdom', row: 2, col: 2 },
  { code: 'DK', name: 'Denmark', row: 2, col: 4 },
  { code: 'EE', name: 'Estonia', row: 2, col: 6 },
  { code: 'NL', name: 'Netherlands', row: 3, col: 3 },
  { code: 'DE', name: 'Germany', row: 3, col: 4 },
  { code: 'PL', name: 'Poland', row: 3, col: 5 },
  { code: 'LV', name: 'Latvia', row: 3, col: 6 },
  { code: 'FR', name: 'France', row: 4, col: 2 },
  { code: 'BE', name: 'Belgium', row: 4, col: 3 },
  { code: 'LU', name: 'Luxembourg', row: 4, col: 4 },
  { code: 'CZ', name: 'Czechia', row: 4, col: 5 },
  { code: 'LT', name: 'Lithuania', row: 4, col: 6 },
  { code: 'PT', name: 'Portugal', row: 5, col: 1 },
  { code: 'ES', name: 'Spain', row: 5, col: 2 },
  { code: 'CH', name: 'Switzerland', row: 5, col: 3 },
  { code: 'LI', name: 'Liechtenstein', row: 5, col: 4 },
  { code: 'AT', name: 'Austria', row: 5, col: 5 },
  { code: 'SK', name: 'Slovakia', row: 5, col: 6 },
  { code: 'IT', name: 'Italy', row: 6, col: 3 },
  { code: 'SI', name: 'Slovenia', row: 6, col: 4 },
  { code: 'HU', name: 'Hungary', row: 6, col: 5 },
  { code: 'RO', name: 'Romania', row: 6, col: 6 },
  { code: 'HR', name: 'Croatia', row: 7, col: 4 },
  { code: 'BG', name: 'Bulgaria', row: 7, col: 6 },
  { code: 'MT', name: 'Malta', row: 8, col: 3 },
  { code: 'GR', name: 'Greece', row: 8, col: 5 },
  { code: 'CY', name: 'Cyprus', row: 8, col: 7 },
]
