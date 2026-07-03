import { describe, it, expect } from 'vitest'
import { queueEyebrowText, takeQueuedEyebrowText } from './eyebrow-queue'

describe('eyebrow-queue', () => {
  it('starts empty', () => {
    expect(takeQueuedEyebrowText()).toBeNull()
  })

  it('hands out a queued text exactly once', () => {
    queueEyebrowText('snack time')
    expect(takeQueuedEyebrowText()).toBe('snack time')
    expect(takeQueuedEyebrowText()).toBeNull()
  })

  it('keeps only the latest write', () => {
    queueEyebrowText('first')
    queueEyebrowText('second')
    expect(takeQueuedEyebrowText()).toBe('second')
    expect(takeQueuedEyebrowText()).toBeNull()
  })

  it('leaves text within the limit untouched', () => {
    queueEyebrowText('a'.repeat(100))
    expect(takeQueuedEyebrowText()).toBe('a'.repeat(100))
  })

  it('caps overflow at 100 chars and marks the cut with an ellipsis', () => {
    queueEyebrowText('a'.repeat(500))
    const out = takeQueuedEyebrowText()
    expect(out).toHaveLength(100)
    expect(out?.endsWith('…')).toBe(true)
  })
})
