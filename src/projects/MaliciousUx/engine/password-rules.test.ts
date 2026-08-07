import { describe, expect, it } from 'vitest'
import { copy } from '../exhibits/PasteProofPassword/data'
import {
  ALLOWED_SYMBOLS,
  checkPassword,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_RULE_ORDER,
  PasswordRule,
  passwordAccepted,
} from './password-rules'

describe('checkPassword', () => {
  it('reports nothing satisfied for an empty password, apart from the ones about excess', () => {
    const met = checkPassword('')

    expect(met[PasswordRule.minLength]).toBe(false)
    expect(met[PasswordRule.mixture]).toBe(false)
  })

  it('ticks the length rule at the minimum, not before', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MIN - 1))[PasswordRule.minLength]).toBe(false)
    expect(checkPassword('a'.repeat(PASSWORD_MIN))[PasswordRule.minLength]).toBe(true)
  })

  it('unticks the length rule one character past the maximum', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MAX))[PasswordRule.maxLength]).toBe(true)
    expect(checkPassword('a'.repeat(PASSWORD_MAX + 1))[PasswordRule.maxLength]).toBe(false)
  })

  it('wants a capital, a number, and a symbol together', () => {
    expect(checkPassword('Password1')[PasswordRule.mixture]).toBe(false)
    expect(checkPassword('password1!')[PasswordRule.mixture]).toBe(false)
    expect(checkPassword('Password1!')[PasswordRule.mixture]).toBe(true)
  })

  it('rejects punctuation outside the approved two', () => {
    expect(checkPassword(`Password1${ALLOWED_SYMBOLS[0]}`)[PasswordRule.symbols]).toBe(true)
    expect(checkPassword('Password1#')[PasswordRule.symbols]).toBe(false)
  })
})

describe('passwordAccepted', () => {
  it('accepts a password that threads the whole policy', () => {
    expect(passwordAccepted('Passw0rd!')).toBe(true)
  })

  it('refuses one that satisfies every rule but the length cap', () => {
    expect(passwordAccepted('Passw0rd!Passw0rd!')).toBe(false)
  })

  it('agrees with the checklist the field draws', () => {
    const value = 'Passw0rd!'
    const met = checkPassword(value)
    expect(PASSWORD_RULE_ORDER.every((rule) => met[rule])).toBe(passwordAccepted(value))
  })
})

describe('the rules on screen', () => {
  it('labels every rule the checker knows about, once each', () => {
    expect(PASSWORD_RULE_ORDER).toHaveLength(Object.values(PasswordRule).length)
    expect(new Set(PASSWORD_RULE_ORDER).size).toBe(PASSWORD_RULE_ORDER.length)

    for (const rule of PASSWORD_RULE_ORDER) {
      expect(copy.rules[rule].length).toBeGreaterThan(0)
    }
  })

  it('quotes the real limits, so the label cannot drift from the check', () => {
    expect(copy.rules[PasswordRule.minLength]).toContain(String(PASSWORD_MIN))
    expect(copy.rules[PasswordRule.maxLength]).toContain(String(PASSWORD_MAX))
  })
})
