/**
 * The password policy that arrives one clause at a time. Every rule is satisfiable, and so is the whole
 * set: the cruelty is that you only meet a rule after it has already failed you.
 *
 * The order is chosen to make each disclosure worse than the last. A symbol is demanded well before the
 * clause narrowing it to two obscure characters, so satisfying the first one is what earns the second.
 */

export const LateRule = {
  minLength: 'minLength',
  hasNumber: 'hasNumber',
  hasCapital: 'hasCapital',
  hasSymbol: 'hasSymbol',
  noLeadingLetter: 'noLeadingLetter',
  oneNumberOnly: 'oneNumberOnly',
  approvedSymbolsOnly: 'approvedSymbolsOnly',
  notTheObviousWord: 'notTheObviousWord',
} as const
export type LateRule = (typeof LateRule)[keyof typeof LateRule]

export const LATE_MIN_LENGTH = 8
/** The only two symbols the policy will accept, disclosed long after it demands one. */
export const APPROVED_SYMBOLS = ['&', '%']
/** The word the policy will not hear, whatever case you try it in. */
export const BANNED_WORD = 'password'

const isSymbol = (character: string) => /[^A-Za-z0-9]/.test(character)
const symbolsIn = (value: string) => [...value].filter(isSymbol)

const checks: Record<LateRule, (value: string) => boolean> = {
  [LateRule.minLength]: (value) => value.length >= LATE_MIN_LENGTH,
  [LateRule.hasNumber]: (value) => /[0-9]/.test(value),
  [LateRule.hasCapital]: (value) => /[A-Z]/.test(value),
  [LateRule.hasSymbol]: (value) => symbolsIn(value).length > 0,
  [LateRule.noLeadingLetter]: (value) => value.length > 0 && !/[A-Za-z]/.test(value[0]),
  [LateRule.oneNumberOnly]: (value) => (value.match(/[0-9]/g) ?? []).length === 1,
  [LateRule.approvedSymbolsOnly]: (value) =>
    symbolsIn(value).every((symbol) => APPROVED_SYMBOLS.includes(symbol)),
  [LateRule.notTheObviousWord]: (value) => !value.toLowerCase().includes(BANNED_WORD),
}

/** The order the policy admits to its rules. Each one lands only after the previous is satisfied. */
export const LATE_RULE_ORDER: readonly LateRule[] = [
  LateRule.minLength,
  LateRule.hasNumber,
  LateRule.hasCapital,
  LateRule.hasSymbol,
  LateRule.noLeadingLetter,
  LateRule.oneNumberOnly,
  LateRule.approvedSymbolsOnly,
  LateRule.notTheObviousWord,
]

/** How many rules the visitor has been let in on at the start. */
export const RULES_KNOWN_UP_FRONT = 1

export type Disclosure = {
  /** How many rules the visitor now knows about. */
  revealed: number
  /** The rule the password breaks, or null when it survives the lot. */
  broken: LateRule | null
}

/**
 * What one submit earns you: every rule the password already satisfies is admitted to at once, and the
 * disclosure stops at the first rule it breaks. So a password that clears four clauses learns all four
 * plus the one that failed, rather than being sent round the loop once per clause.
 *
 * Rules past the failure stay secret, and a rule once disclosed is never taken back. That is the pattern:
 * the policy is knowable, and you are only ever shown the part of it you have already run into.
 */
export function discloseFor(value: string, revealed: number): Disclosure {
  const index = LATE_RULE_ORDER.findIndex((rule) => !checks[rule](value))
  if (index === -1) return { revealed: LATE_RULE_ORDER.length, broken: null }

  return { revealed: Math.max(revealed, index + 1), broken: LATE_RULE_ORDER[index] }
}

/** Whether the password would survive the entire policy, disclosed or not. */
export const survivesEveryRule = (value: string): boolean =>
  LATE_RULE_ORDER.every((rule) => checks[rule](value))

/**
 * Which rules the password currently satisfies. The exhibit only ever draws this for the clauses it has
 * already admitted to, so the undisclosed half of the policy stays secret.
 */
export function checkAll(value: string): Record<LateRule, boolean> {
  return Object.fromEntries(LATE_RULE_ORDER.map((rule) => [rule, checks[rule](value)])) as Record<
    LateRule,
    boolean
  >
}
