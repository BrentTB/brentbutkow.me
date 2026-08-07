/** The bank's password policy: each rule is reasonable alone and together they leave a narrow gap. */

export const PasswordRule = {
  minLength: 'minLength',
  maxLength: 'maxLength',
  mixture: 'mixture',
  symbols: 'symbols',
} as const
export type PasswordRule = (typeof PasswordRule)[keyof typeof PasswordRule]

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 12
/** The only punctuation the policy will accept. */
export const ALLOWED_SYMBOLS = '!?'

const isSymbol = (character: string) => /[^A-Za-z0-9]/.test(character)

const checks: Record<PasswordRule, (value: string) => boolean> = {
  [PasswordRule.minLength]: (value) => value.length >= PASSWORD_MIN,
  [PasswordRule.maxLength]: (value) => value.length <= PASSWORD_MAX,
  [PasswordRule.mixture]: (value) =>
    /[A-Z]/.test(value) && /[0-9]/.test(value) && [...value].some(isSymbol),
  [PasswordRule.symbols]: (value) =>
    [...value].every((character) => !isSymbol(character) || ALLOWED_SYMBOLS.includes(character)),
}

/** The order the rules are listed in. */
export const PASSWORD_RULE_ORDER: readonly PasswordRule[] = [
  PasswordRule.minLength,
  PasswordRule.maxLength,
  PasswordRule.mixture,
  PasswordRule.symbols,
]

/** Which rules the password currently satisfies. */
export function checkPassword(value: string): Record<PasswordRule, boolean> {
  return {
    [PasswordRule.minLength]: checks[PasswordRule.minLength](value),
    [PasswordRule.maxLength]: checks[PasswordRule.maxLength](value),
    [PasswordRule.mixture]: checks[PasswordRule.mixture](value),
    [PasswordRule.symbols]: checks[PasswordRule.symbols](value),
  }
}

export const passwordAccepted = (value: string): boolean =>
  PASSWORD_RULE_ORDER.every((rule) => checks[rule](value))
