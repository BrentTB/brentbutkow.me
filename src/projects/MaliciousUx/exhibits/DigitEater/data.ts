export const copy = {
  label: 'Mobile number',
  hint: 'We format this for you as you type.',
  quiet: 'Nothing entered yet.',
  count: (typed: number, kept: number) => `${typed} digits typed, ${kept} kept.`,
}
