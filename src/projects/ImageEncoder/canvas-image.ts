// Bridges browser image files and raw RGBA pixels. Decoding goes through a
// canvas; encoding writes a PNG, which is lossless — a JPEG would recompress the
// pixels and destroy the embedded payload, so the output is always PNG.

import { RasterImage } from './image-encoder.types'

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode that image'))
    image.src = url
  })
}

export async function fileToRaster(file: File): Promise<RasterImage> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImageElement(url)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(image, 0, 0)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return { data, width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function rasterToPngBlob(raster: RasterImage): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = raster.width
  canvas.height = raster.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas 2D context unavailable'))
  ctx.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png')
  })
}
