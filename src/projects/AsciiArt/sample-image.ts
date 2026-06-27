// A 1x1 transparent PNG, used if the canvas can't be drawn (e.g. in jsdom tests).
const FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

// Fixed star field — hardcoded so the scene is deterministic (no Math.random).
const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [40, 50, 1.4, 0.9],
  [110, 32, 0.9, 0.6],
  [180, 70, 1.1, 0.8],
  [70, 130, 0.8, 0.5],
  [150, 200, 1.3, 0.85],
  [60, 260, 1.0, 0.7],
  [200, 300, 0.9, 0.6],
  [430, 70, 1.2, 0.8],
  [460, 150, 0.8, 0.5],
  [120, 320, 1.1, 0.75],
  [30, 200, 0.9, 0.6],
  [250, 40, 1.0, 0.7],
]

// Draws a self-contained demo scene (a shaded planet + ring over a starfield) and
// returns it as a PNG data URL. The smooth radial gradient gives a full tonal
// range, which shows off the ASCII mapping. No external assets, no tainting.
export function drawSampleScene(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (!ctx) return FALLBACK

  const space = ctx.createLinearGradient(0, 0, 0, 360)
  space.addColorStop(0, '#05060a')
  space.addColorStop(1, '#1b2030')
  ctx.fillStyle = space
  ctx.fillRect(0, 0, 480, 360)

  for (const [x, y, radius, alpha] of STARS) {
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const cx = 320
  const cy = 185
  const radius = 110
  const planet = ctx.createRadialGradient(cx - 42, cy - 48, 12, cx, cy, radius)
  planet.addColorStop(0, '#ffffff')
  planet.addColorStop(0.45, '#9aa7c2')
  planet.addColorStop(1, '#080b14')
  ctx.fillStyle = planet
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(222,224,236,0.55)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.ellipse(cx, cy, radius + 42, 20, -0.35, 0, Math.PI * 2)
  ctx.stroke()

  try {
    return canvas.toDataURL('image/png')
  } catch {
    return FALLBACK
  }
}
