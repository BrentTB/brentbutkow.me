import { RefObject, useEffect } from 'react'

type Particle = {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  colour: string
}

const particleColours = ['#ff0000', '#00ff00', '#0000ff']
const backgroundColour = '#000000'
const INFLUENCE_RADIUS = 100
const PARTICLE_GAP_FACTOR = 28

const getParticles = (canvas: HTMLCanvasElement, particleGapFactor: number) => {
  const { width: rectWidth } = canvas.getBoundingClientRect()
  const width = Math.round(rectWidth)
  const height = Math.max(240, Math.min(320, Math.floor((width / 3) * 1.2)))
  canvas.width = width
  canvas.height = height

  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const octx = offscreen.getContext('2d')
  if (!octx) return []

  const fontSize = Math.min(width * 0.45, 500)
  const text = '404'
  const chars = [...text]

  octx.font = `700 ${fontSize}px "IBM Plex Sans", system-ui, sans-serif`
  octx.textAlign = 'left'
  octx.textBaseline = 'middle'

  const baselineY = height / 2 + fontSize * 0.05
  const startX = (width - octx.measureText(text).width) / 2

  // Render each digit on its own and capture its alpha map. A particle's colour
  // is then decided by which digit it belongs to, so colours can't bleed across
  // digit boundaries (the previous "split the canvas into thirds" approach did).
  const charAlphas = chars.map((char, i) => {
    octx.clearRect(0, 0, width, height)
    octx.fillStyle = '#ffffff'
    octx.fillText(char, startX + octx.measureText(text.slice(0, i)).width, baselineY)
    return octx.getImageData(0, 0, width, height).data
  })

  const particles: Particle[] = []
  const gap = Math.max(10, Math.floor(fontSize / particleGapFactor))

  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const index = (y * width + x) * 4 + 3
      const charIndex = charAlphas.findIndex((alphas) => alphas[index] > 200)
      const colour = charIndex === -1 ? backgroundColour : particleColours[charIndex]
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        colour,
      })
    }
  }
  return particles
}

// Renders "404" as a field of particles on the canvas and animates them: the
// pointer repels nearby particles while a spring pulls each back to its origin
// (spring/damping are live-tunable). Owns the rAF loop, pointer + resize
// listeners, and their cleanup. No-ops if the canvas or 2D context is missing.
export function useParticleField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  spring: number,
  damping: number
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number
    const pointer = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
    let particles = getParticles(canvas, PARTICLE_GAP_FACTOR)

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
    }

    const handlePointerLeave = () => {
      pointer.x = Number.POSITIVE_INFINITY
      pointer.y = Number.POSITIVE_INFINITY
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        const dx = p.x - pointer.x
        const dy = p.y - pointer.y
        const dist = Math.hypot(dx, dy)

        if (dist < INFLUENCE_RADIUS) {
          const force = (INFLUENCE_RADIUS - dist) / INFLUENCE_RADIUS
          const angle = Math.atan2(dy, dx)
          p.vx += Math.cos(angle) * force * 3.2
          p.vy += Math.sin(angle) * force * 3.2
        }

        const toBaseX = p.baseX - p.x
        const toBaseY = p.baseY - p.y
        p.vx += toBaseX * spring
        p.vy += toBaseY * spring

        p.vx *= damping
        p.vy *= damping

        p.x += p.vx
        p.y += p.vy

        ctx.beginPath()
        ctx.fillStyle = p.colour
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      particles = getParticles(canvas, PARTICLE_GAP_FACTOR)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [canvasRef, spring, damping])
}
