import { StrictMode } from 'react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { SHARE_HASH_KEY, SHARE_NOTE_LINGER, SNAPSHOT_MAX_CHARS, simCopy } from './data'
import { SnapshotRefusal, SnapshotResult } from './engine/snapshot'
import { ShareOutcome, useShareLink } from './useShareLink'

const CODE = 'a-world-code'

/** Stand-ins for the sim's two snapshot ports, so the hook is tested without a grid or a canvas. */
function ports(overrides: Partial<Parameters<typeof useShareLink>[0]> = {}) {
  return {
    snapshot: vi.fn(() => Promise.resolve({ code: CODE, heatDropped: false })),
    loadSnapshot: vi.fn((): Promise<SnapshotResult> => Promise.resolve({ ok: true })),
    ...overrides,
  }
}

function writeText() {
  const write = vi.fn(() => Promise.resolve())
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: write },
  })
  return write
}

beforeEach(() => {
  window.history.replaceState(null, '', '/fun-stuff/games/pixel-world-simulator')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useShareLink — sending a world', () => {
  it('puts the world in the hash and on the clipboard', async () => {
    const write = writeText()
    const doors = ports()
    const { result } = renderHook(() => useShareLink(doors))

    act(() => result.current.share())

    await waitFor(() => expect(result.current.note).toBe(simCopy.share.copied))
    expect(window.location.hash).toBe(`#${SHARE_HASH_KEY}=${CODE}`)
    expect(write).toHaveBeenCalledWith(expect.stringContaining(`#${SHARE_HASH_KEY}=${CODE}`))
  })

  it('reports the outcome so the control can show it without being read', async () => {
    writeText()
    const doors = ports()
    const { result } = renderHook(() => useShareLink(doors))
    expect(result.current.outcome).toBe(ShareOutcome.idle)

    act(() => result.current.share())

    await waitFor(() => expect(result.current.outcome).toBe(ShareOutcome.copied))
  })

  it('marks a blocked clipboard apart from a copy and from a refusal', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    })
    const doors = ports()
    const { result } = renderHook(() => useShareLink(doors))

    act(() => result.current.share())

    // The link is good, it is just not on the clipboard, so it is neither a success nor a failure.
    await waitFor(() => expect(result.current.outcome).toBe(ShareOutcome.inBar))
  })

  it('says so when the heat had to be left behind', async () => {
    writeText()
    const doors = ports({ snapshot: () => Promise.resolve({ code: CODE, heatDropped: true }) })
    const { result } = renderHook(() => useShareLink(doors))

    act(() => result.current.share())

    await waitFor(() => expect(result.current.note).toBe(simCopy.share.copiedWithoutHeat))
    expect(result.current.outcome).toBe(ShareOutcome.copied)
  })

  it('clears the outcome along with the note', async () => {
    vi.useFakeTimers()
    writeText()
    const doors = ports()
    const { result } = renderHook(() => useShareLink(doors))

    result.current.share()
    await vi.waitFor(() => expect(result.current.outcome).toBe(ShareOutcome.copied))
    act(() => vi.advanceTimersByTime(SHARE_NOTE_LINGER + 1))

    expect(result.current.outcome).toBe(ShareOutcome.idle)
  })

  it('keeps the world out of anything a server would see', async () => {
    writeText()
    const { result } = renderHook(() => useShareLink(ports()))

    act(() => result.current.share())

    await waitFor(() => expect(result.current.note).not.toBeNull())
    // A snapshot is the visitor's drawing. In the hash it never leaves their browser.
    expect(window.location.search).toBe('')
  })

  it('falls back to the address bar when the clipboard is off limits', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    })
    const doors = ports()
    const { result } = renderHook(() => useShareLink(doors))

    act(() => result.current.share())

    await waitFor(() => expect(result.current.note).toBe(simCopy.share.inBar))
    // The link the visitor asked for is still there to copy by hand.
    expect(window.location.hash).toBe(`#${SHARE_HASH_KEY}=${CODE}`)
  })

  it('refuses a world too detailed to fit, without touching the URL', async () => {
    writeText()
    const overlong = 'x'.repeat(SNAPSHOT_MAX_CHARS + 1)
    const { result } = renderHook(() =>
      useShareLink(
        ports({ snapshot: () => Promise.resolve({ code: overlong, heatDropped: true }) })
      )
    )

    act(() => result.current.share())

    await waitFor(() => expect(result.current.note).toBe(simCopy.share.tooBig))
    expect(result.current.outcome).toBe(ShareOutcome.refused)
    expect(window.location.hash).toBe('')
  })

  it('replaces the URL rather than stacking history, so back does not walk through every share', async () => {
    writeText()
    const { result } = renderHook(() => useShareLink(ports()))
    const before = window.history.length

    act(() => result.current.share())
    await waitFor(() => expect(result.current.note).not.toBeNull())

    expect(window.history.length).toBe(before)
  })

  it('still shares after StrictMode has mounted, unmounted and remounted the hook', async () => {
    // The mount/unmount/remount StrictMode runs in development left a mounted flag stuck false, so the
    // button did nothing. renderHook without a wrapper mounts once and never caught it.
    const write = writeText()
    const { result } = renderHook(() => useShareLink(ports()), { wrapper: StrictMode })

    act(() => result.current.share())

    await waitFor(() => expect(result.current.outcome).toBe(ShareOutcome.copied))
    expect(write).toHaveBeenCalled()
  })

  it('drops the note after a while, so it does not become furniture', async () => {
    vi.useFakeTimers()
    writeText()
    const { result } = renderHook(() => useShareLink(ports()))

    result.current.share()
    await vi.waitFor(() => expect(result.current.note).not.toBeNull())

    act(() => vi.advanceTimersByTime(SHARE_NOTE_LINGER + 1))

    expect(result.current.note).toBeNull()
  })
})

describe('useShareLink — arriving on a world', () => {
  it('loads the world in the hash on arrival', async () => {
    window.history.replaceState(null, '', `#${SHARE_HASH_KEY}=${CODE}`)
    const doors = ports()

    const { result } = renderHook(() => useShareLink(doors))

    await waitFor(() => expect(result.current.note).toBe(simCopy.share.loaded))
    expect(doors.loadSnapshot).toHaveBeenCalledWith(CODE)
    // Arriving on a link is not copying one: the control must show its own state, not the copied tick.
    expect(result.current.outcome).toBe(ShareOutcome.loaded)
  })

  it('says what was wrong with a link it cannot read', async () => {
    window.history.replaceState(null, '', `#${SHARE_HASH_KEY}=${CODE}`)
    const doors = ports({
      loadSnapshot: () => Promise.resolve({ ok: false, refusal: SnapshotRefusal.version }),
    })

    const { result } = renderHook(() => useShareLink(doors))

    await waitFor(() =>
      expect(result.current.note).toBe(simCopy.share.refused[SnapshotRefusal.version])
    )
  })

  it('still reports a refused arrival after a StrictMode remount, rather than falling silent', async () => {
    // The arrival note used to hinge on a per-effect flag the first StrictMode unmount cleared, so a bad
    // link decoded, refused, and said nothing — the world just looked fresh with no reason given.
    window.history.replaceState(null, '', `#${SHARE_HASH_KEY}=${CODE}`)
    const doors = ports({
      loadSnapshot: vi.fn(() => Promise.resolve({ ok: false, refusal: SnapshotRefusal.version })),
    })

    const { result } = renderHook(() => useShareLink(doors), { wrapper: StrictMode })

    await waitFor(() =>
      expect(result.current.note).toBe(simCopy.share.refused[SnapshotRefusal.version])
    )
    // Loaded once across both StrictMode mounts, not twice.
    expect(doors.loadSnapshot).toHaveBeenCalledTimes(1)
  })

  it('has a message for every reason a link can be refused', () => {
    for (const refusal of Object.values(SnapshotRefusal)) {
      expect(simCopy.share.refused[refusal].length).toBeGreaterThan(0)
    }
  })

  it('leaves a plain visit alone', async () => {
    const doors = ports()

    const { result } = renderHook(() => useShareLink(doors))

    expect(doors.loadSnapshot).not.toHaveBeenCalled()
    expect(result.current.note).toBeNull()
  })

  it('ignores a hash that holds something other than a world', async () => {
    window.history.replaceState(null, '', '#some-anchor')
    const doors = ports()

    renderHook(() => useShareLink(doors))

    expect(doors.loadSnapshot).not.toHaveBeenCalled()
  })

  it('ignores an empty world code', () => {
    window.history.replaceState(null, '', `#${SHARE_HASH_KEY}=`)
    const doors = ports()

    renderHook(() => useShareLink(doors))

    expect(doors.loadSnapshot).not.toHaveBeenCalled()
  })

  it('does not reload the URL world over what the visitor has drawn since', async () => {
    // Sharing rewrites the hash. An arrival check tied to the effect's dependencies would fire again on the
    // next render and load that world back over the drawing in progress.
    window.history.replaceState(null, '', '/fun-stuff/games/pixel-world-simulator')
    writeText()
    const doors = ports()
    // A fresh ports object every render, the shape a caller gets wrong most easily.
    const { result } = renderHook(() => useShareLink({ ...doors }))

    act(() => result.current.share())
    await waitFor(() => expect(result.current.note).toBe(simCopy.share.copied))

    expect(doors.loadSnapshot).not.toHaveBeenCalled()
  })

  it('loads once, not once per render', async () => {
    window.history.replaceState(null, '', `#${SHARE_HASH_KEY}=${CODE}`)
    const doors = ports()
    const { result, rerender } = renderHook(() => useShareLink(doors))

    await waitFor(() => expect(result.current.note).not.toBeNull())
    rerender()
    rerender()

    expect(doors.loadSnapshot).toHaveBeenCalledTimes(1)
  })
})
