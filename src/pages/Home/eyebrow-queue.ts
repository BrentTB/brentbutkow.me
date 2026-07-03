// One-shot handoff from the terminal to the hero eyebrow: `echo <text> > .eyebrow` queues a
// line here, and the typewriter shows it as its next alternate before resuming rotation.

// Cap so a runaway `echo` can't feed an absurdly long line into the hero.
const EYEBROW_MAX_LENGTH = 100

let nextText: string | null = null

export function queueEyebrowText(text: string): void {
  nextText = text.slice(0, EYEBROW_MAX_LENGTH)
}

/** Returns the queued text and clears it — each write shows exactly once. */
export function takeQueuedEyebrowText(): string | null {
  const text = nextText
  nextText = null
  return text
}
