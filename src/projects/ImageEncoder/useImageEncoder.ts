import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Base, Mode, RasterImage } from './image-encoder.types'
import { CapacityExceededError, embedPayload, extractPayload } from './engine/codec'
import { maxPayloadBytes } from './engine/capacity'
import { DiffStats, buildDiff } from './engine/diff'
import { WrongKeyError, decryptMessage, encryptMessage } from './engine/crypto'
import { fileToRaster, rasterToPngBlob } from './canvas-image'
import { downloadBlob } from '../../components/utils/download'
import { AES_GCM_TAG_BYTES, DEFAULT_BASE, ENCODED_FILENAME } from './data'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

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

export interface DecodedInfo {
  base: Base
  encrypted: boolean
  needsKey: boolean
  text: string | null
}

// Drives the encoder page: owns the source pixels, runs encode (optionally
// encrypting first) and decode (optionally decrypting), and hands the UI ready
// preview URLs. Object URLs it mints are tracked and revoked on reset/unmount.
export function useImageEncoder() {
  const [mode, setMode] = useState<Mode>(Mode.encode)
  const [message, setMessage] = useState('')
  const [base, setBase] = useState<Base>(DEFAULT_BASE)
  const [useKey, setUseKey] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [source, setSource] = useState<SourceInfo | null>(null)
  const [encoded, setEncoded] = useState<EncodedInfo | null>(null)
  const [decoded, setDecoded] = useState<DecodedInfo | null>(null)
  const [diffUrl, setDiffUrl] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sourceRasterRef = useRef<RasterImage | null>(null)
  const encodedBlobRef = useRef<Blob | null>(null)
  // Ciphertext held between a decode upload and the user entering the key.
  const pendingRef = useRef<{
    payload: Uint8Array
    salt: Uint8Array
    iv: Uint8Array
    base: Base
  } | null>(null)
  const urlsRef = useRef<Set<string>>(new Set())
  const modeRef = useRef(mode)
  modeRef.current = mode

  const trackUrl = useCallback((url: string) => {
    urlsRef.current.add(url)
    return url
  }, [])

  const resetState = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    urlsRef.current.clear()
    encodedBlobRef.current = null
    sourceRasterRef.current = null
    pendingRef.current = null
    setSource(null)
    setEncoded(null)
    setDecoded(null)
    setDiffUrl(null)
    setShowDiff(false)
    setError(null)
  }, [])

  const decodeRaster = useCallback((raster: RasterImage) => {
    const found = extractPayload(raster.data, raster.width, raster.height)
    if (!found) {
      setDecoded(null)
      setError('No hidden message found in this image.')
      return
    }
    if (found.encrypted) {
      if (!found.salt || !found.iv) {
        setError('This message is encrypted but its key data is damaged.')
        return
      }
      pendingRef.current = {
        payload: found.payload,
        salt: found.salt,
        iv: found.iv,
        base: found.base,
      }
      setDecoded({ base: found.base, encrypted: true, needsKey: true, text: null })
      return
    }
    setDecoded({
      base: found.base,
      encrypted: false,
      needsKey: false,
      text: decoder.decode(found.payload),
    })
  }, [])

  const loadImage = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const raster = await fileToRaster(file)
        resetState()
        sourceRasterRef.current = raster
        const previewUrl = trackUrl(URL.createObjectURL(file))
        setSource({ previewUrl, width: raster.width, height: raster.height })
        if (modeRef.current === Mode.decode) decodeRaster(raster)
      } catch {
        setError('Could not read that image. Try a PNG or JPEG.')
      } finally {
        setBusy(false)
      }
    },
    [resetState, trackUrl, decodeRaster]
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
    setShowDiff(false)
    setEncoded(null)
    setDiffUrl(null)
    encodedBlobRef.current = null

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

      const stegoData = embedPayload(raster.data, raster.width, raster.height, payload, {
        base,
        encrypted: useKey,
        salt,
        iv,
      })
      const stego: RasterImage = { data: stegoData, width: raster.width, height: raster.height }

      const blob = await rasterToPngBlob(stego)
      encodedBlobRef.current = blob
      const { raster: heatmap, stats } = buildDiff(raster, stego)
      const diffBlob = await rasterToPngBlob(heatmap)

      setEncoded({ url: trackUrl(URL.createObjectURL(blob)), stats })
      setDiffUrl(trackUrl(URL.createObjectURL(diffBlob)))
    } catch (cause) {
      if (cause instanceof CapacityExceededError) {
        setError(
          'This message is too big for that image. Try a larger image, a higher base, or fewer words.'
        )
      } else {
        setError('Something went wrong while encoding.')
      }
    } finally {
      setBusy(false)
    }
  }, [message, base, useKey, passphrase, trackUrl])

  const submitKey = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending) return
    if (!passphrase) {
      setError('Enter the key for this image.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const plain = await decryptMessage(pending.payload, passphrase, pending.salt, pending.iv)
      setDecoded({
        base: pending.base,
        encrypted: true,
        needsKey: false,
        text: decoder.decode(plain),
      })
    } catch (cause) {
      setError(
        cause instanceof WrongKeyError
          ? 'That key did not work. Check it and try again.'
          : 'Could not unlock this message.'
      )
    } finally {
      setBusy(false)
    }
  }, [passphrase])

  const downloadEncoded = useCallback(() => {
    if (encodedBlobRef.current) downloadBlob(encodedBlobRef.current, ENCODED_FILENAME)
  }, [])

  const changeMode = useCallback(
    (next: Mode) => {
      if (next === modeRef.current) return
      resetState()
      setMode(next)
    },
    [resetState]
  )

  const capacity = useMemo<CapacityInfo | null>(() => {
    if (!source) return null
    const maxBytes = maxPayloadBytes(source.width, source.height, base, useKey)
    const usedBytes = encoder.encode(message).length + (useKey ? AES_GCM_TAG_BYTES : 0)
    return { usedBytes, maxBytes, fits: usedBytes <= maxBytes }
  }, [source, message, base, useKey])

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current.clear()
    },
    []
  )

  return {
    mode,
    message,
    base,
    useKey,
    passphrase,
    source,
    capacity,
    encoded,
    decoded,
    diffUrl,
    showDiff,
    busy,
    error,
    setMode: changeMode,
    setMessage,
    setBase,
    setUseKey,
    setPassphrase,
    setShowDiff,
    loadImage,
    runEncode,
    submitKey,
    downloadEncoded,
    reset: resetState,
  }
}
