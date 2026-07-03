import { RefObject, useEffect } from 'react'
import { createMatrixRain } from './matrix-rain'

// Skip 2 of every 3 rAF ticks — rain reads better at ~20fps than a frantic 60.
const FRAME_STRIDE = 3

/** Runs the matrix rain on the canvas while `running`, cleaning up the loop when it stops. */
export function useMatrixRain(canvasRef: RefObject<HTMLCanvasElement>, running: boolean): void {
  useEffect(() => {
    if (!running) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const sync = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }
    sync()
    const rain = createMatrixRain(ctx, canvas.width, canvas.height)

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      rain.step() // one static frame, no animation
      return
    }

    let raf = 0
    let tick = 0
    const loop = () => {
      if (tick++ % FRAME_STRIDE === 0) rain.step()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => {
      sync()
      rain.resize(canvas.width, canvas.height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [canvasRef, running])
}
