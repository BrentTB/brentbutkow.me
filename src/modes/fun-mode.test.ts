import { describe, it, expect, beforeEach } from 'vitest'
import { enableFunMode, disableFunMode, isFunModeEnabled } from './fun-mode'

describe('fun-mode persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('fun-mode')
  })

  it('defaults to off', () => {
    expect(isFunModeEnabled()).toBe(false)
  })

  it('enableFunMode persists the flag and sets the html class', () => {
    enableFunMode()
    expect(isFunModeEnabled()).toBe(true)
    expect(localStorage.getItem('fun-mode')).toBe('true')
    expect(document.documentElement.classList.contains('fun-mode')).toBe(true)
  })

  it('disableFunMode clears the flag and the html class', () => {
    enableFunMode()
    disableFunMode()
    expect(isFunModeEnabled()).toBe(false)
    expect(localStorage.getItem('fun-mode')).toBeNull()
    expect(document.documentElement.classList.contains('fun-mode')).toBe(false)
  })
})
