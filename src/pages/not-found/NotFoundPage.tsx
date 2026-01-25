import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.scss'

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
const backgroundcolours = ['#000000', '#000000', '#000000']

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
  octx.clearRect(0, 0, width, height)
  octx.fillStyle = '#ffffff'
  octx.font = `800 ${fontSize}px "Space Grotesk", "Inter", system-ui, sans-serif`
  octx.textAlign = 'center'
  octx.textBaseline = 'middle'
  octx.fillText('404', width / 2, height / 2 + fontSize * 0.05)

  const data = octx.getImageData(0, 0, width, height).data
  const particles: Particle[] = []
  const gap = Math.max(10, Math.floor(fontSize / particleGapFactor))

  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const index = (y * width + x) * 4 + 3
      const alpha = data[index]
      const region = x < width / 3 ? 0 : x > (width * 2) / 3 ? 2 : 1
      const colour = alpha <= 200 ? backgroundcolours[region] : particleColours[region]
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

function NotFoundPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [spring, setSpring] = useState(0.1)
  const [damping, setDamping] = useState(0.9)
  const influenceRadius = 100
  const particleGapFactor = 35

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number
    const pointer = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
    let particles = getParticles(canvas, particleGapFactor)

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

        if (dist < influenceRadius) {
          const force = (influenceRadius - dist) / influenceRadius
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
      particles = getParticles(canvas, particleGapFactor)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [spring, damping, influenceRadius, particleGapFactor])

  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <h1>Page not found</h1>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className={styles.canvasShell}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label="404 Error - Animated particle background"
          />
        </div>
        <div className={styles.controlsPanel}>
          <div className={styles.controlGroup}>
            <label htmlFor="spring">Spring</label>
            <input
              id="spring"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={spring}
              onChange={(e) => setSpring(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
          <div className={styles.controlGroup}>
            <label htmlFor="damping">Damping</label>
            <input
              id="damping"
              type="range"
              min="0.8"
              max="1"
              step="0.002"
              value={damping}
              onChange={(e) => setDamping(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
        <Link to="/" className={styles.button}>
          Back to home
        </Link>
      </div>
    </main>
  )
}

export default NotFoundPage
