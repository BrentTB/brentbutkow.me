import { useCallback, useMemo, useRef, useState } from 'react'
import { Base, RasterImage } from './image-encoder.types'
import { CapacityExceededError } from './engine/codec'
import { maxPayloadBytes, smallestBaseThatFits } from './engine/capacity'
import { DiffStats } from './engine/diff'
import { encryptMessage } from './engine/crypto'
import { fileToRaster, rasterToPngBlob } from './canvas-image'
import { encodeInWorker } from './codec-worker-client'
import { downloadBlob } from '../../components/utils/download'
import { AES_GCM_TAG_BYTES, DEFAULT_BASE, ENCODED_FILENAME } from './data'
import { useObjectUrls } from './useObjectUrls'

const encoder = new TextEncoder()

export interface SourceInfo {
  previewUrl: string
  width: number
  height: number
}

export interface CapacityInfo {
  usedBytes: number
  maxBytes: number
  fits: boolean
}

export interface EncodedInfo {
  url: string
  stats: DiffStats
}

// When the message overflows the current base: which base to offer as a swap,
// or whether even the largest base cannot hold it.
export interface FitHint {
  suggestedBase: Base | null
  tooBig: boolean
}

// Encode side of the page: owns the cover pixels and runs the embed (encrypting
// first when a key is set). State lives here so the Hide tab keeps its work even
// while the Reveal tab is showing.
export function useEncoder() {
  const [message, setMessage] = useState('')
  const [base, setBase] = useState<Base>(DEFAULT_BASE)
  const [useKey, setUseKey] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [source, setSource] = useState<SourceInfo | null>(null)
  const [encoded, setEncoded] = useState<EncodedInfo | null>(null)
  const [diffUrl, setDiffUrl] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { track, revokeAll } = useObjectUrls()
  const sourceRasterRef = useRef<RasterImage | null>(null)
  const encodedBlobRef = useRef<Blob | null>(null)

  const clearResult = useCallback(() => {
    setEncoded(null)
    setDiffUrl(null)
    setShowDiff(false)
    encodedBlobRef.current = null
  }, [])

  const loadImage = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const raster = await fileToRaster(file)
        revokeAll()
        clearResult()
        sourceRasterRef.current = raster
        setSource({
          previewUrl: track(URL.createObjectURL(file)),
          width: raster.width,
          height: raster.height,
        })
      } catch {
        setError('Could not read that image. Try a PNG or JPEG.')
      } finally {
        setBusy(false)
      }
    },
    [revokeAll, clearResult, track]
  )

  const runEncode = useCallback(async () => {
    const raster = sourceRasterRef.current
    if (!raster) {
      setError('Add a cover image first.')
      return
    }
    if (!message) {
      setError('Type a message to hide.')
      return
    }
    if (useKey && !passphrase) {
      setError('Enter a key, or switch the lock off.')
      return
    }

    setBusy(true)
    setError(null)
    clearResult()
    try {
      let payload: Uint8Array = encoder.encode(message)
      let salt: Uint8Array | null = null
      let iv: Uint8Array | null = null
      if (useKey) {
        const sealed = await encryptMessage(payload, passphrase)
        payload = sealed.ciphertext
        salt = sealed.salt
        iv = sealed.iv
      }

      const { stego, diff, stats } = await encodeInWorker(raster, payload, {
        base,
        encrypted: useKey,
        salt,
        iv,
      })

      const blob = await rasterToPngBlob(stego)
      encodedBlobRef.current = blob
      const diffBlob = await rasterToPngBlob(diff)

      setEncoded({ url: track(URL.createObjectURL(blob)), stats })
      setDiffUrl(track(URL.createObjectURL(diffBlob)))
    } catch (cause) {
      setError(
        cause instanceof CapacityExceededError
          ? 'This message is too big for that image. Try a larger image, a higher density, or fewer words.'
          : 'Something went wrong while encoding.'
      )
    } finally {
      setBusy(false)
    }
  }, [message, base, useKey, passphrase, clearResult, track])

  const downloadEncoded = useCallback(() => {
    if (encodedBlobRef.current) downloadBlob(encodedBlobRef.current, ENCODED_FILENAME)
  }, [])

  const capacity = useMemo<CapacityInfo | null>(() => {
    if (!source) return null
    const maxBytes = maxPayloadBytes(source.width, source.height, base, useKey)
    const usedBytes = encoder.encode(message).length + (useKey ? AES_GCM_TAG_BYTES : 0)
    return { usedBytes, maxBytes, fits: usedBytes <= maxBytes }
  }, [source, message, base, useKey])

  const fitHint = useMemo<FitHint>(() => {
    if (!source || !capacity || capacity.fits) return { suggestedBase: null, tooBig: false }
    const fit = smallestBaseThatFits(source.width, source.height, useKey, capacity.usedBytes)
    if (fit && fit !== base) return { suggestedBase: fit, tooBig: false }
    return { suggestedBase: null, tooBig: fit === null }
  }, [source, capacity, useKey, base])

  return {
    message,
    base,
    useKey,
    passphrase,
    source,
    capacity,
    encoded,
    diffUrl,
    showDiff,
    busy,
    error,
    fitHint,
    setMessage,
    setBase,
    setUseKey,
    setPassphrase,
    setShowDiff,
    loadImage,
    runEncode,
    downloadEncoded,
  }
}
