import { useRef } from 'react'
import styles from './WaterRipple.module.scss'
import { useWaterRipple } from './useWaterRipple'

function WaterRipple() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useWaterRipple(canvasRef)

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-label="water ripple webgl animation" />
  )
}

export default WaterRipple
