import { APPROVED_SYMBOLS, BANNED_WORD, LATE_MIN_LENGTH, LateRule } from '../../engine/late-rules'

export const copy = {
  label: 'Choose a password',
  submit: 'Continue',
  knownTitle: 'Your password must:',
  rules: {
    [LateRule.minLength]: `Be at least ${LATE_MIN_LENGTH} characters`,
    [LateRule.hasNumber]: 'Contain a number',
    [LateRule.hasCapital]: 'Contain a capital letter',
    [LateRule.hasSymbol]: 'Contain a symbol',
    [LateRule.noLeadingLetter]: 'Not begin with a letter',
    [LateRule.oneNumberOnly]: 'Contain exactly one number',
    [LateRule.approvedSymbolsOnly]: `Use no symbol other than ${APPROVED_SYMBOLS.join(' or ')}`,
    [LateRule.notTheObviousWord]: `Not contain the word "${BANNED_WORD}"`,
  } satisfies Record<LateRule, string>,
  /** The specimen's own error: it will not say which rule, so the list marks them off instead. */
  broken: 'That does not meet the requirements above.',
  ruleMet: 'met',
  ruleUnmet: 'not met',
  quiet: 'Pick a password and continue.',
  newRule: (count: number) =>
    count === 1
      ? 'Almost. One more requirement, which we can now share with you.'
      : `Almost. ${count} more requirements, which we can now share with you.`,
  accepted: (attempts: number) =>
    attempts === 1
      ? 'Password accepted after one attempt.'
      : `Password accepted after ${attempts} attempts.`,
  again: 'Start over',
}
