import { pluralize } from '../../../../utils/pluralize'

export const copy = {
  label: 'Mobile number',
  hint: 'We format this for you as you type.',
  quiet: 'Nothing entered yet.',
  count: (typed: number, kept: number) =>
    `${pluralize(typed, 'digit', 'digits')} typed, ${kept} kept.`,
}
