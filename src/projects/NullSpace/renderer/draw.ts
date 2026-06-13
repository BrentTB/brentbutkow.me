// Fills a circle of `radius` at (x, y) with a radial gradient built from `stops`
// ([offset, color] pairs). Shared glow primitive for hazard mines and the portal.
export function fillRadialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stops: ReadonlyArray<readonly [number, string]>
): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
  for (const [offset, color] of stops) grad.addColorStop(offset, color)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}
