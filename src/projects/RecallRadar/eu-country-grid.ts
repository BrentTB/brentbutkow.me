import type { MapTile } from './components/RecallMap'
import { regionName } from './region-names'

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

// Names resolve through regionName so the map's tooltip/aria always matches the filter chips,
// breakdown rows, and detail facts built from the same codes — one naming source, no drift.
const tile = (code: string, row: number, col: number): MapTile => ({
  code,
  name: regionName(code),
  row,
  col,
})

// Country codes a subscription may narrow to — exactly the codes with a tile, so the filter, the map,
// and any stored value share one source. Rejects a stale or foreign code loaded from the API.
export function isAffectedCountryCode(code: string): boolean {
  return affectedCountryCodes.has(code)
}

export const euCountryGrid: MapTile[] = [
  tile('IS', 1, 1),
  tile('NO', 1, 5),
  tile('SE', 1, 6),
  tile('FI', 1, 7),
  tile('EE', 2, 7),
  tile('IE', 3, 1),
  tile('GB', 3, 2),
  tile('DK', 3, 5),
  tile('LV', 3, 7),
  tile('BE', 4, 3),
  tile('NL', 4, 4),
  tile('DE', 4, 5),
  tile('PL', 4, 6),
  tile('LT', 4, 7),
  tile('FR', 5, 2),
  tile('LU', 5, 3),
  tile('CH', 5, 4),
  tile('LI', 5, 5),
  tile('CZ', 5, 6),
  tile('SK', 5, 7),
  tile('UA', 5, 8),
  tile('PT', 6, 1),
  tile('ES', 6, 2),
  tile('AD', 6, 3),
  tile('IT', 6, 4),
  tile('AT', 6, 5),
  tile('HU', 6, 6),
  tile('RO', 6, 7),
  tile('MD', 6, 8),
  tile('MC', 7, 2),
  tile('SM', 7, 3),
  tile('SI', 7, 4),
  tile('HR', 7, 5),
  tile('BA', 7, 6),
  tile('RS', 7, 7),
  tile('BG', 7, 8),
  tile('TR', 7, 9),
  tile('ME', 8, 6),
  tile('XK', 8, 7),
  tile('MK', 8, 8),
  tile('CY', 8, 9),
  tile('MT', 9, 4),
  tile('AL', 9, 6),
  tile('GR', 9, 7),
]

const affectedCountryCodes = new Set(euCountryGrid.map((t) => t.code))
