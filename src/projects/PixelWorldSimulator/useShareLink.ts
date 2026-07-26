import { useCallback, useEffect, useRef, useState } from 'react'
import { SHARE_HASH_KEY, SHARE_NOTE_LINGER, SNAPSHOT_MAX_CHARS, simCopy } from './data'
import { Snapshot, SnapshotRefusal, SnapshotResult, snapshotsSupported } from './engine/snapshot'

type SnapshotPorts = {
  snapshot(): Promise<Snapshot>
  loadSnapshot(code: string): Promise<SnapshotResult>
}

/**
 * How the last attempt went, for the control to show at a glance. The note says what happened in words; this
 * is so a visitor who is not reading the line underneath still sees whether it worked.
 */
export const ShareOutcome = {
  idle: 'idle',
  copied: 'copied',
  /** The link is good but the clipboard refused it, so it is only in the address bar. */
  inBar: 'inBar',
  refused: 'refused',
} as const
export type ShareOutcome = (typeof ShareOutcome)[keyof typeof ShareOutcome]

export type ShareLink = {
  /** False where the browser has no compression streams, so the control is left out rather than shown broken. */
  supported: boolean
  /** What just happened with the link. Clears itself, so it never becomes part of the furniture. */
  note: string | null
  outcome: ShareOutcome
  share(): void
}

/** The world code out of a URL's hash, or null when there isn't one. */
function codeInHash(hash: string): string | null {
  const code = new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_HASH_KEY)
  return code === null || code.length === 0 ? null : code
}

function refusalNote(refusal: SnapshotRefusal): string {
  return simCopy.share.refused[refusal]
}

/**
 * Both directions of a shared world: reading one out of the URL on arrival, and writing the current one back
 * into the URL and the clipboard on request.
 *
 * The world lives in the hash rather than the query string, so it is never sent to a server — a snapshot is
 * the visitor's drawing, and there is no reason for it to leave their browser. Writing it there before the
 * clipboard is also the fallback: where a browser refuses clipboard access, the link the visitor wanted is
 * still sitting in the address bar.
 */
export function useShareLink({ snapshot, loadSnapshot }: SnapshotPorts): ShareLink {
  const [note, setNote] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ShareOutcome>(ShareOutcome.idle)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((message: string, result: ShareOutcome) => {
    setNote(message)
    setOutcome(result)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setNote(null)
      setOutcome(ShareOutcome.idle)
    }, SHARE_NOTE_LINGER)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  // A world in the URL is loaded once per visit, guarded by a ref rather than by the effect's dependencies:
  // sharing rewrites the hash, so an effect that re-ran would reload that world straight over whatever the
  // visitor had drawn since. Cancelled on unmount so a slow decode cannot land a note on a page that has gone.
  const arrivalRef = useRef(false)
  useEffect(() => {
    if (arrivalRef.current) return
    arrivalRef.current = true

    const code = codeInHash(window.location.hash)
    if (code === null) return

    let live = true
    loadSnapshot(code).then((result) => {
      if (!live) return
      say(
        result.ok ? simCopy.share.loaded : refusalNote(result.refusal),
        result.ok ? ShareOutcome.copied : ShareOutcome.refused
      )
    })

    return () => {
      live = false
    }
  }, [loadSnapshot, say])

  const share = useCallback(() => {
    snapshot().then(async ({ code, heatDropped }) => {
      // Even without its heat, some worlds are past the cap. Nothing useful can be sent for those.
      if (code.length > SNAPSHOT_MAX_CHARS) {
        say(simCopy.share.tooBig, ShareOutcome.refused)
        return
      }

      const link = `${window.location.origin}${window.location.pathname}#${SHARE_HASH_KEY}=${code}`
      // `replaceState` rather than a navigation: the world is already on screen, and pushing history would
      // make the back button walk through every world the visitor has shared.
      window.history.replaceState(null, '', link)

      try {
        await navigator.clipboard.writeText(link)
        say(
          heatDropped ? simCopy.share.copiedWithoutHeat : simCopy.share.copied,
          ShareOutcome.copied
        )
      } catch {
        say(simCopy.share.inBar, ShareOutcome.inBar)
      }
    })
  }, [snapshot, say])

  return { supported: snapshotsSupported(), note, outcome, share }
}
