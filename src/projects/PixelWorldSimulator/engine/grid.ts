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
    velocity: new Map(),
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
  grid.velocity.clear()
}

/**
 * The one place the sim admits that its typed arrays hold `MaterialId` bytes. Every write goes through
 * `placeMaterial` or `transformCell`, so a read is always a real id; this keeps that assertion in a
 * single named spot instead of scattering casts through the engine.
 */
export function asMaterial(value: number): MaterialId {
  return value as MaterialId
}

/** The counter a fresh cell starts with: gas lifetime, acid charges, plant growth steps, or life energy. */
function startingData(material: MaterialId): number {
  const { lifetime, uses, life } = MATERIALS[material]
  return lifetime ?? uses ?? life?.startEnergy ?? 0
}

/**
 * Restarts a cell's own counter while leaving its heat and its fire alone. Drawing a material back over
 * itself tops the counter up, so a spark trail crossed twice expires as one trail instead of dropping
 * holes where the first pass was older.
 */
export function refreshCell(grid: Grid, index: number, material: MaterialId): void {
  grid.data[index] = startingData(material)
}

/** A cell's counters and its heat travel with its material — lava carries its own temperature. */
export function swapCells(grid: Grid, a: number, b: number): void {
  const material = grid.material[b]
  const data = grid.data[b]
  const burn = grid.burn[b]
  const temperature = grid.temperature[b]

  // Heat that moves between rows has to wake them, or the heat pass would skip the row it landed in.
  if (
    temperature !== AMBIENT_TEMPERATURE ||
    grid.temperature[a] !== AMBIENT_TEMPERATURE ||
    burn > 0 ||
    grid.burn[a] > 0
  ) {
    markHotRow(grid, a)
    markHotRow(grid, b)
  }

  grid.material[b] = grid.material[a]
  grid.data[b] = grid.data[a]
  grid.burn[b] = grid.burn[a]
  grid.temperature[b] = grid.temperature[a]

  grid.material[a] = material
  grid.data[a] = data
  grid.burn[a] = burn
  grid.temperature[a] = temperature
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
