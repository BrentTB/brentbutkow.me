import { describe, expect, it } from 'vitest'
import { EU_GRID_COLS, EU_GRID_ROWS, euCountryGrid } from './eu-country-grid'

describe('euCountryGrid', () => {
  it('has unique codes and unique cell positions within the declared bounds', () => {
    const codes = euCountryGrid.map((tile) => tile.code)
    expect(new Set(codes).size).toBe(codes.length)
    const cells = euCountryGrid.map((tile) => `${tile.row},${tile.col}`)
    expect(new Set(cells).size).toBe(cells.length)
    for (const tile of euCountryGrid) {
      expect(tile.row).toBeGreaterThanOrEqual(1)
      expect(tile.row).toBeLessThanOrEqual(EU_GRID_ROWS)
      expect(tile.col).toBeGreaterThanOrEqual(1)
      expect(tile.col).toBeLessThanOrEqual(EU_GRID_COLS)
      expect(tile.code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('covers the EU-27 and excludes countries RASFF never reports', () => {
    const codes = new Set(euCountryGrid.map((tile) => tile.code))
    // prettier-ignore
    const eu27 = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']
    for (const code of eu27) expect(codes.has(code)).toBe(true)
    // A permanent zero tile fakes coverage — RU/BY never occur in RASFF affected data, and the
    // Caucasus trio belongs to Eurovision grids, not food-safety ones.
    for (const code of ['RU', 'BY', 'AM', 'GE', 'AZ']) expect(codes.has(code)).toBe(false)
  })
})
