import { describe, it, expect, beforeEach } from 'vitest'
import { loadHighScore, saveHighScore } from './persistence'

beforeEach(() => {
  localStorage.clear()
})

describe('loadHighScore', () => {
  it('returns 0 when no score saved', () => {
    expect(loadHighScore()).toBe(0)
  })

  it('returns the saved score', () => {
    localStorage.setItem('event-horizon-high-score', '42')
    expect(loadHighScore()).toBe(42)
  })

  it('returns 0 for invalid data', () => {
    localStorage.setItem('event-horizon-high-score', 'not-a-number')
    expect(loadHighScore()).toBe(0)
  })

  it('returns 0 for negative scores', () => {
    localStorage.setItem('event-horizon-high-score', '-10')
    expect(loadHighScore()).toBe(0)
  })
})

describe('saveHighScore', () => {
  it('saves when score is higher than current', () => {
    saveHighScore(100)
    expect(loadHighScore()).toBe(100)
  })

  it('does not overwrite higher existing score', () => {
    saveHighScore(200)
    saveHighScore(50)
    expect(loadHighScore()).toBe(200)
  })

  it('floors the score', () => {
    saveHighScore(99.7)
    expect(loadHighScore()).toBe(99)
  })
})
