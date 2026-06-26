import { useCallback, useMemo, useRef, useState } from 'react'
import { Base, PayloadMode, RasterImage } from './image-encoder.types'
import { CapacityExceededError } from './engine/codec'
import { maxPayloadBytes, smallestBaseThatFits } from './engine/capacity'
import { DiffStats } from './engine/diff'
import { ENVELOPE_HEADER_BYTES, PayloadKind, packPayload } from './engine/payload'
import { encryptMessage } from './engine/crypto'
import { fileToImage, rasterToPngBlob } from './canvas-image'
import { encodeInWorker } from './codec-worker-client'
import { downloadBlob } from '../../components/utils/download'
import { AES_GCM_TAG_BYTES, DEFAULT_BASE, ENCODED_FILENAME } from './data'
import { useObjectUrls } from './useObjectUrls'
import { useLatestRequest } from './useLatestRequest'

const encoder = new TextEncoder()

export interface SourceInfo {
  previewUrl: string
  width: number
  height: number
}

export interface SecretFileInfo {
  name: string
  size: number
  previewUrl: string | null // set only for image files
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

// When the payload overflows the current base: which base to offer as a swap,
// or whether even the largest base cannot hold it.
export interface FitHint {
  suggestedBase: Base | null
  tooBig: boolean
}

// Encode side of the page: owns the cover pixels and the payload (a typed message
// or an uploaded file), and runs the embed (encrypting first when a key is set).
// State lives here so the Hide tab keeps its work while the Reveal tab is shown.
export function useEncoder() {
  const [payloadMode, setPayloadMode] = useState<PayloadMode>(PayloadMode.text)
  const [message, setMessage] = useState('')
  const [secretFile, setSecretFile] = useState<SecretFileInfo | null>(null)
  const [base, setBase] = useState<Base>(DEFAULT_BASE)
  const [spread, setSpread] = useState(false)
  const [useKey, setUseKey] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [source, setSource] = useState<SourceInfo | null>(null)
  const [encoded, setEncoded] = useState<EncodedInfo | null>(null)
  const [diffUrl, setDiffUrl] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cover + result URLs in one scope; the secret-file preview in its own, so
  // loading a new cover doesn't revoke the chosen file's preview (and vice versa).
  const { track, revokeAll } = useObjectUrls()
  const secretUrls = useObjectUrls()
  // Separate trackers: the cover load and the encode share a pipeline (a new
  // cover supersedes a running encode), but a secret-file read is independent.
  const beginCoverRequest = useLatestRequest()
  const beginSecretRequest = useLatestRequest()
  const sourceRasterRef = useRef<RasterImage | null>(null)
  const secretBytesRef = useRef<Uint8Array | null>(null)
  const encodedBlobRef = useRef<Blob | null>(null)

  const clearResult = useCallback(() => {
    setEncoded(null)
    setDiffUrl(null)
    setShowDiff(false)
    encodedBlobRef.current = null
  }, [])

  const loadImage = useCallback(
    async (file: File) => {
      const isStale = beginCoverRequest()
      setBusy(true)
      setError(null)
      try {
        const { raster, previewBlob } = await fileToImage(file)
        if (isStale()) return
        revokeAll()
        clearResult()
        sourceRasterRef.current = raster
        setSource({
          previewUrl: track(URL.createObjectURL(previewBlob)),
          width: raster.width,
          height: raster.height,
        })
      } catch {
        if (!isStale()) setError('Could not read that image. Try a PNG or JPEG.')
      } finally {
        if (!isStale()) setBusy(false)
      }
    },
    [revokeAll, clearResult, track, beginCoverRequest]
  )

  const loadSecretFile = useCallback(
    async (file: File) => {
      const isStale = beginSecretRequest()
      setError(null)
      try {
        const buffer = await file.arrayBuffer()
        if (isStale()) return
        secretBytesRef.current = new Uint8Array(buffer)
        secretUrls.revokeAll()
        const previewUrl = file.type.startsWith('image/')
          ? secretUrls.track(URL.createObjectURL(file))
          : null
        setSecretFile({ name: file.name, size: file.size, previewUrl })
        clearResult()
      } catch {
        if (!isStale()) setError('Could not read that file.')
      }
    },
    [secretUrls, clearResult, beginSecretRequest]
  )

  const runEncode = useCallback(async () => {
    const raster = sourceRasterRef.current
    if (!raster) {
      setError('Add a cover image first.')
      return
    }

    let envelope: Uint8Array
    if (payloadMode === PayloadMode.file) {
      const fileBytes = secretBytesRef.current
      if (!fileBytes || !secretFile) {
        setError('Add a file to hide.')
        return
      }
      envelope = packPayload({ kind: PayloadKind.file, name: secretFile.name, bytes: fileBytes })
    } else {
      if (!message) {
        setError('Type a message to hide.')
        return
      }
      envelope = packPayload({ kind: PayloadKind.text, name: '', bytes: encoder.encode(message) })
    }

    if (useKey && !passphrase) {
      setError('Enter a key, or switch the lock off.')
      return
    }

    const isStale = beginCoverRequest()
    setBusy(true)
    setError(null)
    clearResult()
    try {
      let payload = envelope
      let salt: Uint8Array | null = null
      let iv: Uint8Array | null = null
      if (useKey) {
        const sealed = await encryptMessage(payload, passphrase)
        payload = sealed.ciphertext
        salt = sealed.salt
        iv = sealed.iv
      }

      // Fresh seed each encode, so the same image + payload still scatters differently.
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]
      const { stego, diff, stats } = await encodeInWorker(raster, payload, {
        base,
        encrypted: useKey,
        spread,
        seed,
        salt,
        iv,
      })

      const blob = await rasterToPngBlob(stego)
      const diffBlob = await rasterToPngBlob(diff)
      if (isStale()) return
      encodedBlobRef.current = blob
      setEncoded({ url: track(URL.createObjectURL(blob)), stats })
      setDiffUrl(track(URL.createObjectURL(diffBlob)))
    } catch (cause) {
      if (isStale()) return
      setError(
        cause instanceof CapacityExceededError
          ? 'This is too big for that image. Try a larger image, a higher density, or a smaller payload.'
          : 'Something went wrong while encoding.'
      )
    } finally {
      if (!isStale()) setBusy(false)
    }
  }, [
    payloadMode,
    message,
    secretFile,
    base,
    spread,
    useKey,
    passphrase,
    clearResult,
    track,
    beginCoverRequest,
  ])

  const downloadEncoded = useCallback(() => {
    if (encodedBlobRef.current) downloadBlob(encodedBlobRef.current, ENCODED_FILENAME)
  }, [])

  const capacity = useMemo<CapacityInfo | null>(() => {
    if (!source) return null
    const maxBytes = maxPayloadBytes(source.width, source.height, base, useKey)
    const contentBytes =
      payloadMode === PayloadMode.file ? (secretFile?.size ?? 0) : encoder.encode(message).length
    const nameBytes =
      payloadMode === PayloadMode.file ? encoder.encode(secretFile?.name ?? '').length : 0
    const usedBytes =
      ENVELOPE_HEADER_BYTES + nameBytes + contentBytes + (useKey ? AES_GCM_TAG_BYTES : 0)
    return { usedBytes, maxBytes, fits: usedBytes <= maxBytes }
  }, [source, payloadMode, message, secretFile, base, useKey])

  const fitHint = useMemo<FitHint>(() => {
    if (!source || !capacity || capacity.fits) return { suggestedBase: null, tooBig: false }
    const fit = smallestBaseThatFits(source.width, source.height, useKey, capacity.usedBytes)
    if (fit && fit !== base) return { suggestedBase: fit, tooBig: false }
    return { suggestedBase: null, tooBig: fit === null }
  }, [source, capacity, useKey, base])

  return {
    payloadMode,
    message,
    secretFile,
    base,
    spread,
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
    setPayloadMode,
    setMessage,
    setBase,
    setSpread,
    setUseKey,
    setPassphrase,
    setShowDiff,
    loadImage,
    loadSecretFile,
    runEncode,
    downloadEncoded,
  }
}
