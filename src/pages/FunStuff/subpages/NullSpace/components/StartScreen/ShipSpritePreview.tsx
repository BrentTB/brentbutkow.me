import { useEffect, useRef } from 'react'
import { SHIP_SPRITE_KEY } from '../../renderer/renderer'
import { SPRITE_MAP } from '../../renderer/sprites'
import { ShipKind } from '../../engine/types'
import styles from './ShipSpritePreview.module.scss'

const PREVIEW_PIXEL = 5

type ShipSpritePreviewProps = {
  kind: ShipKind
}

export function ShipSpritePreview({ kind }: ShipSpritePreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const data = SPRITE_MAP[SHIP_SPRITE_KEY[kind]]
    const h = data.length
    const w = data[0].length
    canvas.width = w * PREVIEW_PIXEL
    canvas.height = h * PREVIEW_PIXEL

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = data[y][x]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(x * PREVIEW_PIXEL, y * PREVIEW_PIXEL, PREVIEW_PIXEL, PREVIEW_PIXEL)
        }
      }
    }
  }, [kind])

  return <canvas ref={ref} className={styles.shipPreviewCanvas} />
}
