export const copy = {
  label: 'Mobile number',
  hint: 'We format this for you as you type.',
  quiet: 'Nothing entered yet.',
  count: (typed: number, kept: number) =>
    `${typed} ${typed === 1 ? 'digit' : 'digits'} typed, ${kept} kept.`,
}
