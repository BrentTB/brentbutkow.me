import { useCallback, useRef, useState } from 'react'
import { Base, RasterImage } from './image-encoder.types'
import { WrongKeyError, decryptMessage } from './engine/crypto'
import { fileToImage } from './canvas-image'
import { decodeInWorker } from './codec-worker-client'
import { useObjectUrls } from './useObjectUrls'

const decoder = new TextDecoder()

export interface DecodeSourceInfo {
  previewUrl: string
  width: number
  height: number
}

export interface DecodedInfo {
  base: Base
  encrypted: boolean
  needsKey: boolean
  text: string | null
}

// Decode side of the page: reads an uploaded image and, when the message is
// locked, holds the ciphertext until the user supplies a key. Independent of the
// encode hook so the Reveal tab keeps its state across tab switches.
export function useDecoder() {
  const [source, setSource] = useState<DecodeSourceInfo | null>(null)
  const [decoded, setDecoded] = useState<DecodedInfo | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { track, revokeAll } = useObjectUrls()
  const pendingRef = useRef<{
    payload: Uint8Array
    salt: Uint8Array
    iv: Uint8Array
    base: Base
  } | null>(null)

  const decodeRaster = useCallback(async (raster: RasterImage) => {
    const found = await decodeInWorker(raster)
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
        const { raster, previewBlob } = await fileToImage(file)
        revokeAll()
        pendingRef.current = null
        setDecoded(null)
        setSource({
          previewUrl: track(URL.createObjectURL(previewBlob)),
          width: raster.width,
          height: raster.height,
        })
        await decodeRaster(raster)
      } catch {
        setError('Could not read that image. Try a PNG or JPEG.')
      } finally {
        setBusy(false)
      }
    },
    [revokeAll, track, decodeRaster]
  )

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

  return {
    source,
    decoded,
    passphrase,
    busy,
    error,
    setPassphrase,
    loadImage,
    submitKey,
  }
}
