import { describe, expect, it } from 'vitest'
import {
  BEAD_RATIO,
  CELL_HIT_RATIO,
  FOG_FLOOR,
  PITCH_LIMIT,
  RAIL_MIN_SPACING_PX,
  VIEW_LAYOUTS,
  ZOOM_RANGE,
  cellPosition,
  clampPitch,
  clampZoom,
  columnScreenSpacing,
  fogFor,
  layerScreenOffsets,
  minFanGap,
  plateCenter,
  rotateForCamera,
  snapCamera,
  spacingFor,
  winBarTransform,
  yawToFace,
} from './geometry'
import { BOARD_SIZE, cellCoord, cellIndex } from './lines'
import { Camera, ViewMode } from '../tic-tac-toe.types'

const SPACING = 100
const camera = (yaw: number, pitch: number, zoom = 1): Camera => ({ yaw, pitch, zoom })

/** Rodrigues' formula: rotate `v` about the unit axis `n` by `angle` degrees. */
function rotateAbout(
  v: { x: number; y: number; z: number },
  n: { x: number; y: number; z: number },
  angleDegrees: number
) {
  const t = (angleDegrees * Math.PI) / 180
  const cos = Math.cos(t)
  const sin = Math.sin(t)
  const dot = n.x * v.x + n.y * v.y + n.z * v.z
  const cross = {
    x: n.y * v.z - n.z * v.y,
    y: n.z * v.x - n.x * v.z,
    z: n.x * v.y - n.y * v.x,
  }
  return {
    x: v.x * cos + cross.x * sin + n.x * dot * (1 - cos),
    y: v.y * cos + cross.y * sin + n.y * dot * (1 - cos),
    z: v.z * cos + cross.z * sin + n.z * dot * (1 - cos),
  }
}

describe('the fanned deck stays separated', () => {
  /**
   * Guards the plate overlap bug: a plate is 4·sin(pitch) spacings tall on screen while layers sit
   * only gap·cos(pitch) apart, so too small a gap makes the plates overlap and edge beads straddle
   * two of them. The shipped gap has to clear that bound.
   */
  it('gives the fanned layers a gap wider than the plates themselves', () => {
    const { gap, pitch } = VIEW_LAYOUTS[ViewMode.fanned]
    expect(gap).toBeGreaterThan(minFanGap(pitch))
  })

  it('reports a larger required gap as the view tips further down', () => {
    expect(minFanGap(50)).toBeGreaterThan(minFanGap(34))
  })

  it('leaves room for a bead on top of the plate height', () => {
    expect(minFanGap(34)).toBeGreaterThan(4 * Math.tan((34 * Math.PI) / 180))
  })
})

describe('click targets do not blanket their neighbours', () => {
  /**
   * Guards the unclickable-cell bug: at a hit width of 0.92 spacings the near column's targets
   * covered the column behind it. The target has to stay inside the on-screen column gap.
   */
  it('keeps a cell target narrower than the gap between columns in orbit', () => {
    expect(CELL_HIT_RATIO).toBeLessThan(columnScreenSpacing(VIEW_LAYOUTS[ViewMode.orbit].yaw))
  })

  it('still leaves the target wider than the bead it has to cover', () => {
    expect(CELL_HIT_RATIO).toBeGreaterThan(BEAD_RATIO)
  })
})

describe('cellPosition', () => {
  it('centres the board on the origin', () => {
    const first = cellPosition(cellCoord(cellIndex(0, 0, 0)), ViewMode.orbit, SPACING)
    const last = cellPosition(
      cellCoord(cellIndex(BOARD_SIZE - 1, BOARD_SIZE - 1, BOARD_SIZE - 1)),
      ViewMode.orbit,
      SPACING
    )
    expect(first.x).toBeCloseTo(-last.x)
    expect(first.y).toBeCloseTo(-last.y)
    expect(first.z).toBeCloseTo(-last.z)
  })

  it('puts layer 1 at the bottom and layer 4 at the top', () => {
    const bottom = cellPosition({ x: 0, y: 0, layer: 0 }, ViewMode.orbit, SPACING)
    const top = cellPosition({ x: 0, y: 0, layer: BOARD_SIZE - 1 }, ViewMode.orbit, SPACING)
    // +y is down in CSS, so the top layer has the smaller y.
    expect(top.y).toBeLessThan(bottom.y)
  })

  it('fans the layers sideways only in fanned mode', () => {
    const orbitLow = cellPosition({ x: 0, y: 0, layer: 0 }, ViewMode.orbit, SPACING)
    const orbitHigh = cellPosition({ x: 0, y: 0, layer: 3 }, ViewMode.orbit, SPACING)
    expect(orbitLow.x).toBeCloseTo(orbitHigh.x)

    const fanLow = cellPosition({ x: 0, y: 0, layer: 0 }, ViewMode.fanned, SPACING)
    const fanHigh = cellPosition({ x: 0, y: 0, layer: 3 }, ViewMode.fanned, SPACING)
    expect(fanHigh.x).toBeGreaterThan(fanLow.x)
  })
})

describe('spacingFor', () => {
  it('never drops below the mode floor, however cramped the stage', () => {
    for (const mode of [ViewMode.orbit, ViewMode.fanned]) {
      expect(spacingFor(mode, 10, 10)).toBe(VIEW_LAYOUTS[mode].minSpacing)
    }
  })

  it('is limited by whichever axis runs out first', () => {
    const layout = VIEW_LAYOUTS[ViewMode.orbit]
    const wide = spacingFor(ViewMode.orbit, 4000, 700)
    expect(wide).toBeCloseTo(700 / layout.heightUnits)
    const tall = spacingFor(ViewMode.orbit, 620, 4000)
    expect(tall).toBeCloseTo(620 / layout.widthUnits)
  })

  it('gives the fanned deck less room per step, since it has more to fit vertically', () => {
    expect(spacingFor(ViewMode.fanned, 1200, 900)).toBeLessThan(
      spacingFor(ViewMode.orbit, 1200, 900)
    )
  })
})

describe('rotateForCamera', () => {
  it('leaves a point alone when the camera is square on', () => {
    const point = { x: 3, y: -5, z: 7 }
    const rotated = rotateForCamera(point, 0, 0)
    expect(rotated.x).toBeCloseTo(point.x)
    expect(rotated.y).toBeCloseTo(point.y)
    expect(rotated.z).toBeCloseTo(point.z)
  })

  it('preserves length, so it is a rotation and not a squash', () => {
    const point = { x: 40, y: -90, z: 25 }
    const rotated = rotateForCamera(point, 34, 16)
    expect(Math.hypot(rotated.x, rotated.y, rotated.z)).toBeCloseTo(
      Math.hypot(point.x, point.y, point.z)
    )
  })

  it('swings a point on the far side toward the viewer as the yaw turns', () => {
    const behind = { x: 0, y: 0, z: -SPACING }
    expect(rotateForCamera(behind, 180, 0).z).toBeCloseTo(SPACING)
  })

  it('tips the top of the board away from the viewer at a positive pitch', () => {
    const above = { x: 0, y: -SPACING, z: 0 }
    expect(rotateForCamera(above, 0, 45).z).toBeLessThan(0)
  })
})

describe('fogFor', () => {
  it('runs from the floor at the back to full strength at the front', () => {
    expect(fogFor(-50, 50, -50)).toBeCloseTo(FOG_FLOOR)
    expect(fogFor(50, 50, -50)).toBeCloseTo(1)
    expect(fogFor(0, 50, -50)).toBeCloseTo((FOG_FLOOR + 1) / 2)
  })

  it('falls back to full strength when every bead is at the same depth', () => {
    expect(fogFor(0, 0, 0)).toBe(1)
  })
})

describe('camera limits', () => {
  it('clamps pitch symmetrically, so the underside and the top are equally reachable', () => {
    expect(clampPitch(400)).toBe(PITCH_LIMIT)
    expect(clampPitch(-400)).toBe(-PITCH_LIMIT)
    expect(clampPitch(20)).toBe(20)
  })

  it('clamps zoom to its range', () => {
    expect(clampZoom(99)).toBe(ZOOM_RANGE.max)
    expect(clampZoom(0)).toBe(ZOOM_RANGE.min)
  })

  it('snaps yaw to 45s and pitch to 15s, staying inside the pitch limit', () => {
    expect(snapCamera(camera(59, 22))).toMatchObject({ yaw: 45, pitch: 15 })
    expect(snapCamera(camera(0, 200)).pitch).toBe(PITCH_LIMIT)
  })
})

describe('layerScreenOffsets', () => {
  it('orders the layers bottom to top on screen', () => {
    const offsets = layerScreenOffsets(ViewMode.orbit, SPACING, camera(34, 16))
    for (let layer = 1; layer < offsets.length; layer++) {
      expect(offsets[layer]).toBeLessThan(offsets[layer - 1])
    }
  })

  it('matches the projected plate centre, perspective divide included', () => {
    const mode = ViewMode.orbit
    const view = camera(34, 40)
    const offsets = layerScreenOffsets(mode, SPACING, view)
    const { perspective } = VIEW_LAYOUTS[mode]
    const radians = (view.pitch * Math.PI) / 180

    offsets.forEach((offset, layer) => {
      const y = plateCenter(layer, mode, SPACING).y
      const expected =
        (view.zoom * y * Math.cos(radians)) / (1 - (y * Math.sin(radians)) / perspective)
      expect(offset).toBeCloseTo(expected)
    })
  })

  it('spreads the lower plates further apart than the upper ones', () => {
    const [bottom, second, , top] = layerScreenOffsets(ViewMode.orbit, SPACING, camera(34, 40))
    const third = layerScreenOffsets(ViewMode.orbit, SPACING, camera(34, 40))[2]
    expect(Math.abs(bottom - second)).toBeGreaterThan(Math.abs(third - top))
  })

  it('falls back to even spacing when a top-down view collapses the stack', () => {
    const offsets = layerScreenOffsets(ViewMode.orbit, SPACING, camera(0, PITCH_LIMIT))
    for (let layer = 1; layer < offsets.length; layer++) {
      expect(Math.abs(offsets[layer] - offsets[layer - 1])).toBeCloseTo(RAIL_MIN_SPACING_PX)
    }
  })

  it('scales with zoom', () => {
    const near = layerScreenOffsets(ViewMode.orbit, SPACING, camera(34, 16, 1))
    const far = layerScreenOffsets(ViewMode.orbit, SPACING, camera(34, 16, 2))
    expect(Math.abs(far[0])).toBeGreaterThan(Math.abs(near[0]))
  })
})

describe('winBarTransform', () => {
  /**
   * Guards the mirrored win-rod bug: the bar's own axis is +y, and getting the axis-angle pair wrong
   * reflects the bar instead of aligning it, so it lay across the wrong diagonal of the cube.
   */
  it('rotates the bar onto the line it is meant to lie along', () => {
    const cases: [number, number, number][][] = [
      [
        [0, 0, 0],
        [3, 3, 3],
      ],
      [
        [0, 3, 0],
        [3, 0, 3],
      ],
      [
        [1, 0, 2],
        [1, 3, 2],
      ],
      [
        [0, 1, 1],
        [3, 1, 1],
      ],
    ]

    for (const [from, to] of cases) {
      const start = cellPosition(
        { x: from[0], y: from[1], layer: from[2] },
        ViewMode.orbit,
        SPACING
      )
      const end = cellPosition({ x: to[0], y: to[1], layer: to[2] }, ViewMode.orbit, SPACING)
      const bar = winBarTransform(start, end)

      const aligned = rotateAbout(
        { x: 0, y: 1, z: 0 },
        { x: bar.axisX, y: 0, z: bar.axisZ },
        bar.angle
      )
      const expected = {
        x: (end.x - start.x) / bar.length,
        y: (end.y - start.y) / bar.length,
        z: (end.z - start.z) / bar.length,
      }
      expect(aligned.x).toBeCloseTo(expected.x)
      expect(aligned.y).toBeCloseTo(expected.y)
      expect(aligned.z).toBeCloseTo(expected.z)
    }
  })

  it('spans the full distance between the end beads', () => {
    const start = cellPosition({ x: 0, y: 0, layer: 0 }, ViewMode.orbit, SPACING)
    const end = cellPosition({ x: 3, y: 3, layer: 3 }, ViewMode.orbit, SPACING)
    const bar = winBarTransform(start, end)
    expect(bar.length).toBeCloseTo(Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z))
    expect(bar.midpoint.x).toBeCloseTo((start.x + end.x) / 2)
    expect(bar.midpoint.y).toBeCloseTo((start.y + end.y) / 2)
  })

  it('leaves a line straight up a rod unrotated', () => {
    const bar = winBarTransform({ x: 0, y: 150, z: 0 }, { x: 0, y: -150, z: 0 })
    expect(bar.angle).toBe(0)
  })

  it('survives a degenerate zero-length line', () => {
    const bar = winBarTransform({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })
    expect(bar.length).toBe(0)
    expect(bar.angle).toBe(0)
  })
})

describe('yawToFace', () => {
  /**
   * Guards the collapsed-win bug: swapping the arguments to atan2 aimed the winning line straight at
   * the camera, stacking all four beads into a single column.
   */
  it('turns the board so the line runs widest across the view, not toward it', () => {
    const start = cellPosition({ x: 0, y: 0, layer: 0 }, ViewMode.orbit, SPACING)
    const end = cellPosition({ x: 3, y: 3, layer: 3 }, ViewMode.orbit, SPACING)
    const yaw = yawToFace(start, end, 0)

    const direction = { x: end.x - start.x, y: 0, z: end.z - start.z }
    const rotated = rotateForCamera(direction, yaw, 0)
    // All of the line's horizontal extent ends up across the screen, none of it into the depth.
    expect(Math.abs(rotated.z)).toBeLessThan(1e-6)
    expect(Math.abs(rotated.x)).toBeCloseTo(Math.hypot(direction.x, direction.z))
  })

  it('keeps the current yaw for a line up a rod, which looks the same from anywhere', () => {
    expect(yawToFace({ x: 0, y: 0, z: 0 }, { x: 0, y: -300, z: 0 }, 27)).toBe(27)
  })
})
