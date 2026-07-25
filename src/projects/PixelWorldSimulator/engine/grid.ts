import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { MATERIALS } from './materials'

export function createGrid(width: number, height: number): Grid {
  const cells = width * height
  return {
    width,
    height,
    material: new Uint8Array(cells),
    moved: new Uint8Array(cells),
    data: new Uint8Array(cells),
    burn: new Uint8Array(cells),
    temperature: new Int16Array(cells).fill(AMBIENT_TEMPERATURE),
    temperatureNext: new Int16Array(cells).fill(AMBIENT_TEMPERATURE),
    hotRows: new Uint8Array(height),
    hotRowsNext: new Uint8Array(height),
  }
}

export function cellIndex(grid: Grid, x: number, y: number): number {
  return y * grid.width + x
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && x < grid.width && y >= 0 && y < grid.height
}

export function clearGrid(grid: Grid): void {
  grid.material.fill(MaterialId.empty)
  grid.moved.fill(0)
  grid.data.fill(0)
  grid.burn.fill(0)
  grid.temperature.fill(AMBIENT_TEMPERATURE)
  grid.temperatureNext.fill(AMBIENT_TEMPERATURE)
  grid.hotRows.fill(0)
  grid.hotRowsNext.fill(0)
}

/** The counter a fresh cell starts with: gas lifetime, acid charges, plant growth steps. */
function startingData(material: MaterialId): number {
  const { lifetime, uses } = MATERIALS[material]
  return lifetime ?? uses ?? 0
}

/** Wakes a row and its neighbours for the heat pass. */
export function markHotRow(grid: Grid, index: number): void {
  const row = Math.floor(index / grid.width)
  grid.hotRows[row] = 1
  if (row > 0) grid.hotRows[row - 1] = 1
  if (row < grid.height - 1) grid.hotRows[row + 1] = 1
}

/** Places a brand new cell, with its own starting temperature and counter. */
export function placeMaterial(grid: Grid, index: number, material: MaterialId): void {
  grid.material[index] = material
  grid.data[index] = startingData(material)
  grid.burn[index] = 0
  grid.temperature[index] = MATERIALS[material].startTemperature ?? AMBIENT_TEMPERATURE
  markHotRow(grid, index)
}

/**
 * Turns an existing cell into something else — melting, freezing, burning out. Temperature carries
 * over, because the heat that caused the change doesn't vanish with it.
 */
export function transformCell(grid: Grid, index: number, material: MaterialId): void {
  grid.material[index] = material
  grid.data[index] = startingData(material)
  grid.burn[index] = 0
  markHotRow(grid, index)
}
