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
  PLATE_GAP_RATIO,
  deckHeight,
  fanGapFor,
  fanHeightUnits,
  clampZoom,
  siteScreenSpacing,
  yawIsClickable,
  fogFor,
  layerScreenOffsets,
  minFanGap,
  plateCenter,
  rotateForCamera,
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
  it('gives the fanned layers a gap wide enough to clear the plates themselves', () => {
    const { gap, pitch } = VIEW_LAYOUTS[ViewMode.fanned]
    expect(gap).toBeGreaterThanOrEqual(minFanGap(pitch) - 1e-9)
  })

  it('reports a larger required gap as the view tips further down', () => {
    expect(minFanGap(50)).toBeGreaterThan(minFanGap(34))
  })

  it('leaves room for a bead on top of the plate height', () => {
    const { pitch } = VIEW_LAYOUTS[ViewMode.fanned]
    expect(minFanGap(pitch)).toBeGreaterThan(4 * Math.tan((pitch * Math.PI) / 180))
  })
})

describe('click targets do not blanket their neighbours', () => {
  /**
   * Guards the unclickable-cell bug: at a hit width of 0.92 spacings the near column's targets covered
   * the column behind it. Both in-layer directions have to be checked, and the binding one changes with
   * the yaw: rows separate as columns close up, and they swap over at 45°.
   */
  it('keeps a cell target inside the on-screen gap at the starting yaw', () => {
    expect(yawIsClickable(VIEW_LAYOUTS[ViewMode.orbit].yaw)).toBe(true)
    expect(CELL_HIT_RATIO / 2).toBeLessThan(siteScreenSpacing(VIEW_LAYOUTS[ViewMode.orbit].yaw))
  })

  /** Square-on to one axis, the other lines up behind itself: the near site covers the far one. */
  it('reports the axis-aligned yaws as unclickable', () => {
    for (const yaw of [0, 90, 180, 270, -90]) {
      expect(yawIsClickable(yaw)).toBe(false)
    }
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
    const [bottom, second, third, top] = layerScreenOffsets(ViewMode.orbit, SPACING, camera(34, 40))
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

  /**
   * A rod is parallel to the bar's own axis, so there is no rotation axis to compute — but the direction
   * still matters. Layers stack upwards in −y, so a line read bottom-to-top points the bar's +y axis the
   * other way and needs the half turn.
   */
  it('turns a bar that points down without looking for an axis', () => {
    const upwards = winBarTransform({ x: 0, y: 150, z: 0 }, { x: 0, y: -150, z: 0 })
    expect(upwards.angle).toBe(180)

    const downwards = winBarTransform({ x: 0, y: -150, z: 0 }, { x: 0, y: 150, z: 0 })
    expect(downwards.angle).toBe(0)
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

  /**
   * Regression: a line along one of the board's own axes is widest square-on, and square-on is where the
   * other axis stacks up behind itself. The camera is left where a win put it, so that angle greeted the
   * next game with three of every four columns hidden behind the front one.
   */
  it('never parks on a yaw where sites cover their neighbours', () => {
    const inLayer: [number, number][] = [
      [cellIndex(0, 0, 0), cellIndex(3, 0, 0)], // along x
      [cellIndex(0, 0, 0), cellIndex(0, 3, 0)], // along y
      [cellIndex(3, 0, 0), cellIndex(0, 0, 0)], // and the same two, reversed
      [cellIndex(0, 3, 0), cellIndex(0, 0, 0)],
    ]

    for (const [from, to] of inLayer) {
      const yaw = yawToFace(
        cellPosition(cellCoord(from), ViewMode.orbit, SPACING),
        cellPosition(cellCoord(to), ViewMode.orbit, SPACING),
        VIEW_LAYOUTS[ViewMode.orbit].yaw
      )
      expect(yawIsClickable(yaw)).toBe(true)
    }
  })

  /** The nudge is the smallest one that clears the overlap, so the line still reads nearly square-on. */
  it('turns only just far enough off the axis', () => {
    const yaw = yawToFace(
      cellPosition({ x: 0, y: 0, layer: 0 }, ViewMode.orbit, SPACING),
      cellPosition({ x: 3, y: 0, layer: 0 }, ViewMode.orbit, SPACING),
      0
    )
    expect(Math.abs(yaw)).toBeLessThan(25)
    expect(siteScreenSpacing(yaw)).toBeCloseTo(CELL_HIT_RATIO / 2)
  })
})

describe('deckHeight', () => {
  /**
   * Guards the dead-space bug: the container is sized to exactly what the arrangement needs, so nothing
   * is left to pad above or below it. The spacing is limited by the usable width and a viewport cap,
   * never by the container's own height, which is what made the measurement chase its own tail.
   */
  it('is exactly the height the arrangement occupies at that spacing', () => {
    // A phone-width stage less the layer rail, against a cap a phone viewport would actually give.
    const usableWidth = 336 - 49
    const viewportCap = 420

    for (const mode of [ViewMode.orbit, ViewMode.fanned]) {
      const layout = VIEW_LAYOUTS[mode]
      const spacing = spacingFor(mode, usableWidth, viewportCap)
      const height = deckHeight(mode, spacing)

      expect(height).toBeCloseTo(spacing * layout.heightUnits, 5)
      /* Inside the cap, unless the minimum spacing had to win: a board too small to read is worse than
         one that runs past its box, so the floor takes precedence over the cap by design. */
      if (spacing > layout.minSpacing) expect(height).toBeLessThanOrEqual(viewportCap + 1e-6)
    }
  })

  /** The readable floor beats the cap, and says so rather than silently overflowing on a short viewport. */
  it('lets the minimum spacing overrun a cap that would make the board unreadable', () => {
    const tiny = spacingFor(ViewMode.orbit, 2000, 150)
    expect(tiny).toBe(VIEW_LAYOUTS[ViewMode.orbit].minSpacing)
    expect(deckHeight(ViewMode.orbit, tiny)).toBeGreaterThan(150)
  })

  it('grows with the spacing and gives the fanned deck the taller box', () => {
    expect(deckHeight(ViewMode.fanned, 40)).toBeGreaterThan(deckHeight(ViewMode.fanned, 20))
    expect(deckHeight(ViewMode.fanned, 40)).toBeGreaterThan(deckHeight(ViewMode.orbit, 40))
  })
})

describe('depth fog per view', () => {
  it('fades with depth in the cube, where beads hide behind each other', () => {
    expect(VIEW_LAYOUTS[ViewMode.orbit].depthFog).toBe(true)
  })

  /** Separated plates never occlude, so a bead dimmed for depth there just reads as another layer. */
  it('leaves the fanned deck at full strength', () => {
    expect(VIEW_LAYOUTS[ViewMode.fanned].depthFog).toBe(false)
  })
})

describe('the fanned plate gap', () => {
  const { pitch, gap } = VIEW_LAYOUTS[ViewMode.fanned]
  const radians = (pitch * Math.PI) / 180
  const plateHeight = 4 * Math.sin(radians)
  const visibleGap = gap * Math.cos(radians) - plateHeight

  it('shows a gap of at least PLATE_GAP_RATIO of a plate height between plates', () => {
    expect(visibleGap / plateHeight).toBeGreaterThanOrEqual(PLATE_GAP_RATIO)
  })

  /** A bead is a fixed size, so the gap can never be squeezed below one however small the ratio. */
  it('never shows a gap narrower than a bead, whatever ratio is asked for', () => {
    for (const ratio of [0, 0.05, 0.2, 0.5]) {
      const asked = fanGapFor(pitch, ratio)
      expect(asked * Math.cos(radians) - plateHeight).toBeGreaterThanOrEqual(BEAD_RATIO - 1e-9)
    }
  })

  it('lands on the tightest safe ratio when a tighter one is asked for', () => {
    // PLATE_GAP_RATIO of 0.2 is below the floor at this pitch, so the shipped gap is one bead wide.
    expect(visibleGap).toBeCloseTo(BEAD_RATIO)
    expect(visibleGap / plateHeight).toBeCloseTo(0.241, 2)
  })

  it('honours a ratio that is already wide enough, without inflating it', () => {
    const generous = fanGapFor(pitch, 1)
    expect(generous * Math.cos(radians) - plateHeight).toBeCloseTo(plateHeight)
  })

  /** The derived gap still has to clear the bound that stops edge beads straddling two plates. */
  it('stays clear of the overlap bound', () => {
    expect(gap).toBeGreaterThanOrEqual(minFanGap(pitch) - 1e-9)
  })

  it('follows the ratio it is given once past the floor', () => {
    expect(fanGapFor(pitch, 1)).toBeGreaterThan(fanGapFor(pitch, 0.5))
    expect(fanGapFor(pitch, 0)).toBeCloseTo(minFanGap(pitch))
  })

  it('derives a height that matches the space the deck actually needs', () => {
    expect(VIEW_LAYOUTS[ViewMode.fanned].heightUnits).toBeCloseTo(fanHeightUnits(pitch, gap))
    expect(fanHeightUnits(pitch, gap)).toBeGreaterThan(3 * gap * Math.cos(radians))
  })
})
