// Bridges browser image files and raw RGBA pixels. Decoding goes through a
// canvas; encoding writes a PNG, which is lossless — a JPEG would recompress the
// pixels and destroy the embedded payload, so the output is always PNG.

import { RasterImage } from './image-encoder.types'

// On-screen previews never need more than this; a 24MP photo would otherwise sit
// in memory as a ~100MB bitmap just to paint at a few hundred pixels.
const PREVIEW_MAX_DIM = 1400

export interface LoadedImage {
  raster: RasterImage
  previewBlob: Blob
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode that image'))
    image.src = url
  })
}

function scaledPreviewBlob(image: HTMLImageElement, width: number, height: number): Promise<Blob> {
  const scale = Math.min(1, PREVIEW_MAX_DIM / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas 2D context unavailable'))
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Preview failed'))),
      'image/png'
    )
  })
}

// Decodes a file once into full-resolution pixels (for encoding/decoding and the
// download) plus a downscaled blob for display.
export async function fileToImage(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImageElement(url)
    const width = image.naturalWidth
    const height = image.naturalHeight
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(image, 0, 0)
    const { data } = ctx.getImageData(0, 0, width, height)
    const previewBlob = await scaledPreviewBlob(image, width, height)
    return { raster: { data, width, height }, previewBlob }
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
  // Copy into a fresh ArrayBuffer-backed view to satisfy ImageData's typing.
  const pixels = new Uint8ClampedArray(raster.data)
  ctx.putImageData(new ImageData(pixels, raster.width, raster.height), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))),
      'image/png'
    )
  })
}
