/** How long the field lets you look at what you typed before hiding it again. */
export const REVEAL_MS = 1_000

export const copy = {
  label: 'Choose a password',
  hint: 'For your security, pasting is disabled in this field.',
  reveal: 'Show',
  revealLabel: 'Show the password',
  quiet: 'Nothing typed yet. Try pasting something.',
  typed: (length: number) => `${length} characters typed by hand.`,
  peeked: 'Hidden again. It was showing for one second.',
  blocked: (times: number) =>
    times === 1 ? '1 paste blocked. Type it out.' : `${times} pastes blocked. Type it out.`,
}
