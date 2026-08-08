import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LATE_RULE_ORDER, LateRule, RULES_KNOWN_UP_FRONT } from '../../engine/late-rules'
import { copy } from './data'
import { LateRules } from './LateRules'

afterEach(cleanup)

const PERFECT = '1Quetzalcoatl&'
/** Clears everything up to the one-number clause, and trips on that. */
const NEARLY = '1Quetzal2&'

const listedRules = () => screen.getAllByRole('listitem').map((item) => item.textContent)
const submit = () => fireEvent.click(screen.getByRole('button', { name: copy.submit }))
const type = (value: string) =>
  fireEvent.change(screen.getByLabelText(copy.label), { target: { value: value } })

describe('LateRules', () => {
  it('opens with only the rules it admits to up front', () => {
    render(<LateRules />)
    expect(listedRules()).toHaveLength(RULES_KNOWN_UP_FRONT)
  })

  /**
   * One clause per submit made a good guess as slow as a bad one. A submit now costs you exactly one
   * attempt however many rules the password already cleared.
   */
  it('discloses every satisfied rule in a single submit, stopping at the failure', () => {
    render(<LateRules />)
    type(NEARLY)

    submit()

    const expected = LATE_RULE_ORDER.indexOf(LateRule.oneNumberOnly) + 1
    expect(listedRules()).toHaveLength(expected)
    expect(screen.getByText(copy.newRule(expected - RULES_KNOWN_UP_FRONT))).toBeTruthy()
  })

  it('leaves every clause unmarked before a key is pressed', () => {
    render(<LateRules />)

    const marked = listedRules().filter(
      (rule) => rule?.includes(copy.ruleMet) || rule?.includes(copy.ruleUnmet)
    )
    expect(marked).toHaveLength(0)
  })

  /**
   * The form's own error refuses to say which clause you missed. Once every rule is on screen that left
   * nothing to go on but guessing, so the list keeps score for the clauses already disclosed.
   */
  it('ticks off the disclosed clauses the password satisfies, and crosses the one it does not', () => {
    render(<LateRules />)
    type(NEARLY)
    submit()

    const rules = listedRules()
    const failed = rules.filter((rule) => rule?.includes(`(${copy.ruleUnmet})`))
    const passed = rules.filter((rule) => rule?.includes(`(${copy.ruleMet})`))

    expect(failed).toHaveLength(1)
    expect(failed[0]).toContain(copy.rules[LateRule.oneNumberOnly])
    expect(passed).toHaveLength(rules.length - 1)
  })

  it('moves the cross as the password changes, without waiting for a submit', () => {
    render(<LateRules />)
    type(NEARLY)
    submit()
    type('short&')

    const failed = listedRules().filter((rule) => rule?.includes(`(${copy.ruleUnmet})`))
    expect(failed.some((rule) => rule?.includes(copy.rules[LateRule.minLength]))).toBe(true)
  })

  it('reveals nothing new while the same rule is still broken', () => {
    render(<LateRules />)
    type('short')

    submit()
    submit()

    expect(listedRules()).toHaveLength(RULES_KNOWN_UP_FRONT)
    expect(screen.getByText(copy.broken)).toBeTruthy()
  })

  it('accepts a password that clears the lot on the first press', () => {
    render(<LateRules />)
    type(PERFECT)

    submit()

    expect(listedRules()).toHaveLength(LATE_RULE_ORDER.length)
    expect(screen.getByText(copy.accepted(1))).toBeTruthy()
  })

  it('counts every attempt, including the ones it caused', () => {
    render(<LateRules />)
    type('short')
    submit()
    type(PERFECT)
    submit()

    expect(screen.getByText(copy.accepted(2))).toBeTruthy()
  })

  it('starts over cleanly', () => {
    render(<LateRules />)
    type(PERFECT)
    submit()

    fireEvent.click(screen.getByRole('button', { name: copy.again }))

    expect(listedRules()).toHaveLength(RULES_KNOWN_UP_FRONT)
    expect(screen.getByText(copy.quiet)).toBeTruthy()
    expect((screen.getByLabelText(copy.label) as HTMLInputElement).value).toBe('')
  })
})
