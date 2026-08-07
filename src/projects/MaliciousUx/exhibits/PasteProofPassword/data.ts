import {
  ALLOWED_SYMBOLS,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PasswordRule,
} from '../../engine/password-rules'

export const copy = {
  label: 'Choose a password',
  hint: 'For your security, pasting is disabled in this field.',
  rulesTitle: 'Your password must:',
  rules: {
    [PasswordRule.minLength]: `Be at least ${PASSWORD_MIN} characters`,
    [PasswordRule.maxLength]: `Be no more than ${PASSWORD_MAX} characters`,
    [PasswordRule.mixture]: 'Contain a capital letter, a number, and a symbol',
    [PasswordRule.symbols]: `Use no symbols other than ${[...ALLOWED_SYMBOLS].join(' and ')}`,
  } satisfies Record<PasswordRule, string>,
  met: 'met',
  unmet: 'not met',
  quiet: 'Nothing typed yet.',
  typed: (length: number) => `${length} characters typed by hand.`,
  accepted: 'Every rule satisfied. You may now type it again to confirm.',
  blocked: (times: number) =>
    times === 1 ? '1 paste blocked. Keep typing.' : `${times} pastes blocked. Keep typing.`,
}
