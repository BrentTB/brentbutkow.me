// One-shot handoff from the terminal to the hero eyebrow: `echo <text> > .eyebrow` queues a
// line here, and the typewriter shows it as its next alternate before resuming rotation.

let nextText: string | null = null

export function queueEyebrowText(text: string): void {
  nextText = text
}

/** Returns the queued text and clears it — each write shows exactly once. */
export function takeQueuedEyebrowText(): string | null {
  const text = nextText
  nextText = null
  return text
}
