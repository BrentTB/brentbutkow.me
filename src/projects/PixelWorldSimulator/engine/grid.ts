import { Grid, MaterialId } from '../pixel-world.types'

export function createGrid(width: number, height: number): Grid {
  const cells = width * height
  return {
    width,
    height,
    material: new Uint8Array(cells),
    moved: new Uint8Array(cells),
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
}
