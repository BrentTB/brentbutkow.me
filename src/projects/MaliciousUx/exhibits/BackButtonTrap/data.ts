export const copy = {
  url: 'listicle.example/15-foods',
  backLabel: 'Back',
  quiet: 'Press the back arrow.',
  trapped: (presses: number) =>
    presses === 1
      ? 'Back pressed once. You are on the same article.'
      : `Back pressed ${presses} times. You are on the same article.`,
  escaped: (presses: number) => `Out, after ${presses} presses.`,
  keyboardEscaped: 'Out on the first press, because the keyboard did it.',
  again: 'Go back in',
  exit: 'You left the site.',
  filler: 'Everyone keeps bread in the wrong place. Scroll on for the other fourteen.',
}
