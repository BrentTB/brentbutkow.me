import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SHARE_HASH_KEY,
  SHARE_NOTE_LINGER,
  SHARE_PAUSED_KEY,
  SNAPSHOT_MAX_CHARS,
  simCopy,
} from './data'
import { Snapshot, SnapshotRefusal, SnapshotResult, snapshotsSupported } from './engine/snapshot'

type SnapshotPorts = {
  snapshot(): Promise<Snapshot>
  loadSnapshot(code: string): Promise<SnapshotResult>
  /** Called with a world that arrived paused, so the sim can stop before the visitor sees it move. */
  onArrivePaused(): void
  /**
   * Called with whether the sender had air currents on. Air changes what a world does rather than how it
   * looks, so a link replays into something else entirely if the reader's own setting disagrees.
   */
  onArriveAirCurrents(on: boolean): void
}

/**
 * How the last attempt went, for the control to show at a glance. The note says what happened in words; this
 * is so a visitor who is not reading the line underneath still sees whether it worked.
 */
export const ShareOutcome = {
  idle: 'idle',
  copied: 'copied',
  /** A world read out of the link on arrival: it worked, but the visitor copied nothing. */
  loaded: 'loaded',
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
  /**
   * True from the moment a paused world arrives until the visitor starts it. A still world with no explanation
   * reads as broken, so the page puts a play control over it for exactly this long.
   */
  arrivedPaused: boolean
  /** The visitor has started it: drop the overlay for the rest of the visit. */
  acknowledgePaused(): void
  share(): void
}

/** The world code out of a URL's hash, or null when there isn't one. */
function codeInHash(hash: string): string | null {
  const code = new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_HASH_KEY)
  return code === null || code.length === 0 ? null : code
}

/** Whether the link asks for the world to arrive paused. Anything but the flag reads as "run it". */
function pausedInHash(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_PAUSED_KEY) === '1'
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
export function useShareLink({
  snapshot,
  loadSnapshot,
  onArrivePaused,
  onArriveAirCurrents,
}: SnapshotPorts): ShareLink {
  const [note, setNote] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ShareOutcome>(ShareOutcome.idle)
  const [arrivedPaused, setArrivedPaused] = useState(false)
  // Read through a ref for the same reason `onClose` is elsewhere: the page hands it down afresh about ten
  // times a second, and the arrival effect must run once per visit rather than on every one of those renders.
  const arrivePausedRef = useRef(onArrivePaused)
  arrivePausedRef.current = onArrivePaused
  const arriveAirRef = useRef(onArriveAirCurrents)
  arriveAirRef.current = onArriveAirCurrents
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const say = useCallback((message: string, result: ShareOutcome) => {
    setNote(message)
    setOutcome(result)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setNote(null)
      setOutcome(ShareOutcome.idle)
    }, SHARE_NOTE_LINGER)
  }, [])

  // Reset on every mount, not just at first render: StrictMode mounts, unmounts and remounts, and the
  // cleanup below would otherwise leave the flag stuck false — freezing share and swallowing the arrival note.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  // A world in the URL is loaded once per visit, guarded by a ref rather than by the effect's dependencies:
  // sharing rewrites the hash, so an effect that re-ran would reload that world straight over whatever the
  // visitor had drawn since. The note is gated on the mounted ref, not a per-effect flag: under StrictMode the
  // load fires on the first mount, and its result still has to land once the second mount has settled.
  const arrivalRef = useRef(false)
  useEffect(() => {
    if (arrivalRef.current) return
    arrivalRef.current = true

    const code = codeInHash(window.location.hash)
    if (code === null) return

    const paused = pausedInHash(window.location.hash)

    loadSnapshot(code).then((result) => {
      if (!mountedRef.current) return
      if (!result.ok) {
        say(refusalNote(result.refusal), ShareOutcome.refused)
        return
      }
      // Match the sender's air setting before anything runs, so the world behaves the way they built it.
      arriveAirRef.current(result.airCurrents)
      // Stop the world before the visitor sees it move, then hand them something to press.
      if (paused) {
        arrivePausedRef.current()
        setArrivedPaused(true)
      }
      say(paused ? simCopy.share.loadedPaused : simCopy.share.loaded, ShareOutcome.loaded)
    })
  }, [loadSnapshot, say])

  const share = useCallback(() => {
    snapshot().then(async ({ code, heatDropped }) => {
      // A clipboard prompt can outlive the page — the visitor may leave while it is up — so every outcome
      // checks the component is still mounted before it lands a note on it.
      if (!mountedRef.current) return

      // Even without its heat, some worlds are past the cap. Nothing useful can be sent for those.
      if (code.length > SNAPSHOT_MAX_CHARS) {
        say(simCopy.share.tooBig, ShareOutcome.refused)
        return
      }

      // Every link arrives paused, whatever the world was doing when it was sent. Whoever opens it gets a
      // moment to look at what was built before it starts falling apart, and the sender does not have to
      // remember to pause first to give them that.
      const link =
        `${window.location.origin}${window.location.pathname}` +
        `#${SHARE_HASH_KEY}=${code}&${SHARE_PAUSED_KEY}=1`
      // `replaceState` rather than a navigation: the world is already on screen, and pushing history would
      // make the back button walk through every world the visitor has shared.
      window.history.replaceState(null, '', link)

      try {
        await navigator.clipboard.writeText(link)
        if (!mountedRef.current) return
        say(
          heatDropped ? simCopy.share.copiedWithoutHeat : simCopy.share.copied,
          ShareOutcome.copied
        )
      } catch {
        if (!mountedRef.current) return
        say(simCopy.share.inBar, ShareOutcome.inBar)
      }
    })
  }, [snapshot, say])

  const acknowledgePaused = useCallback(() => setArrivedPaused(false), [])

  return {
    supported: snapshotsSupported(),
    note,
    outcome,
    arrivedPaused,
    acknowledgePaused,
    share,
  }
}
