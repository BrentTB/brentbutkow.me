import { useCallback, useRef, useState } from 'react'
import { Base, RasterImage } from './image-encoder.types'
import { WrongKeyError, decryptMessage } from './engine/crypto'
import { PayloadKind, unpackPayload } from './engine/payload'
import { fileToImage } from './canvas-image'
import { decodeInWorker } from './codec-worker-client'
import { downloadBlob } from '../../components/utils/download'
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
  kind: PayloadKind | null // null while still waiting for a key
  text: string | null
  fileName: string | null
  fileSize: number | null
  fileUrl: string | null // object URL for a hidden file (download + image preview)
}

// Decode side of the page: reads an uploaded image and, when the payload is
// locked, holds the ciphertext until the user supplies a key. Independent of the
// encode hook so the Reveal tab keeps its state across tab switches.
export function useDecoder() {
  const [source, setSource] = useState<DecodeSourceInfo | null>(null)
  const [decoded, setDecoded] = useState<DecodedInfo | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { track, revokeAll } = useObjectUrls()
  const fileBlobRef = useRef<Blob | null>(null)
  const pendingRef = useRef<{
    payload: Uint8Array
    salt: Uint8Array
    iv: Uint8Array
    base: Base
  } | null>(null)

  // Turns decoded (and decrypted) envelope bytes into a shown message or file.
  const presentEnvelope = useCallback(
    (base: Base, encrypted: boolean, envelope: Uint8Array) => {
      const payload = unpackPayload(envelope)
      if (!payload) {
        setError("This image's hidden data looks damaged.")
        return
      }
      if (payload.kind === PayloadKind.file) {
        // Fresh ArrayBuffer-backed copy so the Blob part typing is satisfied.
        const blob = new Blob([new Uint8Array(payload.bytes)])
        fileBlobRef.current = blob
        setDecoded({
          base,
          encrypted,
          needsKey: false,
          kind: PayloadKind.file,
          text: null,
          fileName: payload.name,
          fileSize: payload.bytes.length,
          fileUrl: track(URL.createObjectURL(blob)),
        })
      } else {
        fileBlobRef.current = null
        setDecoded({
          base,
          encrypted,
          needsKey: false,
          kind: PayloadKind.text,
          text: decoder.decode(payload.bytes),
          fileName: null,
          fileSize: null,
          fileUrl: null,
        })
      }
    },
    [track]
  )

  const decodeRaster = useCallback(
    async (raster: RasterImage) => {
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
        setDecoded({
          base: found.base,
          encrypted: true,
          needsKey: true,
          kind: null,
          text: null,
          fileName: null,
          fileSize: null,
          fileUrl: null,
        })
        return
      }
      presentEnvelope(found.base, false, found.payload)
    },
    [presentEnvelope]
  )

  const loadImage = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const { raster, previewBlob } = await fileToImage(file)
        revokeAll()
        fileBlobRef.current = null
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
      presentEnvelope(pending.base, true, plain)
    } catch (cause) {
      setError(
        cause instanceof WrongKeyError
          ? 'That key did not work. Check it and try again.'
          : 'Could not unlock this message.'
      )
    } finally {
      setBusy(false)
    }
  }, [passphrase, presentEnvelope])

  const downloadFile = useCallback(() => {
    if (fileBlobRef.current && decoded?.fileName) {
      downloadBlob(fileBlobRef.current, decoded.fileName)
    }
  }, [decoded])

  return {
    source,
    decoded,
    passphrase,
    busy,
    error,
    setPassphrase,
    loadImage,
    submitKey,
    downloadFile,
  }
}
