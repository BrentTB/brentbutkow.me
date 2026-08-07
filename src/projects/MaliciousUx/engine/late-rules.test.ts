import { describe, expect, it } from 'vitest'
import { copy } from '../exhibits/LateRules/data'
import {
  APPROVED_SYMBOLS,
  BANNED_WORD,
  discloseFor,
  LATE_MIN_LENGTH,
  LATE_RULE_ORDER,
  LateRule,
  RULES_KNOWN_UP_FRONT,
  survivesEveryRule,
} from './late-rules'

/** A password that threads the entire policy: no leading letter, one number, no banned word. */
const PERFECT = '1Quetzalcoatl&'

describe('discloseFor', () => {
  it('names the earliest rule the password breaks', () => {
    expect(discloseFor('abc', RULES_KNOWN_UP_FRONT).broken).toBe(LateRule.minLength)
  })

  /**
   * The slog this replaced: disclosing one clause per submit meant a password that already satisfied
   * four of them still cost four presses to find that out.
   */
  it('admits to every rule the password already satisfies, in one submit', () => {
    // Long enough, has a number, a capital and a symbol, but starts with a letter.
    const { revealed, broken } = discloseFor('Abcdefg1&', RULES_KNOWN_UP_FRONT)

    expect(broken).toBe(LateRule.noLeadingLetter)
    expect(revealed).toBe(LATE_RULE_ORDER.indexOf(LateRule.noLeadingLetter) + 1)
  })

  /**
   * The escalation the policy is built on: it demands a symbol, then waits until you have supplied one
   * before mentioning that only two obscure ones count.
   */
  it('demands a symbol well before it narrows which symbols it will take', () => {
    expect(LATE_RULE_ORDER.indexOf(LateRule.hasSymbol)).toBeLessThan(
      LATE_RULE_ORDER.indexOf(LateRule.approvedSymbolsOnly)
    )
    expect(discloseFor('1Quetzal!', LATE_RULE_ORDER.length).broken).toBe(
      LateRule.approvedSymbolsOnly
    )
    expect(discloseFor(`1Quetzal${APPROVED_SYMBOLS[0]}`, LATE_RULE_ORDER.length).broken).toBeNull()
  })

  it('stops at the failure, keeping the rest of the policy secret', () => {
    const { revealed } = discloseFor('Abcdefg1', RULES_KNOWN_UP_FRONT)
    expect(revealed).toBeLessThan(LATE_RULE_ORDER.length)
  })

  it('never takes back a rule it has already disclosed', () => {
    const { revealed } = discloseFor('abc', LATE_RULE_ORDER.length)
    expect(revealed).toBe(LATE_RULE_ORDER.length)
  })

  it('discloses the whole policy once nothing is broken', () => {
    const { revealed, broken } = discloseFor(PERFECT, RULES_KNOWN_UP_FRONT)

    expect(broken).toBeNull()
    expect(revealed).toBe(LATE_RULE_ORDER.length)
  })

  it('holds the visitor to the length it actually states', () => {
    expect(discloseFor('a'.repeat(LATE_MIN_LENGTH - 1), 1).broken).toBe(LateRule.minLength)
    expect(discloseFor('a'.repeat(LATE_MIN_LENGTH), 1).broken).not.toBe(LateRule.minLength)
  })

  it('objects to a second number, and to the obvious word in any case', () => {
    expect(discloseFor('1Quetzal2&', LATE_RULE_ORDER.length).broken).toBe(LateRule.oneNumberOnly)
    expect(discloseFor(`1${BANNED_WORD.toUpperCase()}X&`, LATE_RULE_ORDER.length).broken).toBe(
      LateRule.notTheObviousWord
    )
  })
})

describe('the policy as a whole', () => {
  /** The point of the exhibit is the drip-feed, not an impossible standard. */
  it('can be satisfied', () => {
    expect(survivesEveryRule(PERFECT)).toBe(true)
  })

  it('labels every rule it can disclose, once each', () => {
    expect(new Set(LATE_RULE_ORDER).size).toBe(LATE_RULE_ORDER.length)
    expect(LATE_RULE_ORDER).toHaveLength(Object.values(LateRule).length)

    for (const rule of LATE_RULE_ORDER) {
      expect(copy.rules[rule].length).toBeGreaterThan(0)
    }
  })

  it('quotes the real limit in the label, so the copy cannot drift from the check', () => {
    expect(copy.rules[LateRule.minLength]).toContain(String(LATE_MIN_LENGTH))
    expect(copy.rules[LateRule.notTheObviousWord]).toContain(BANNED_WORD)
  })
})
