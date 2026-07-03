import { describe, it, expect } from 'vitest'
import { EYEBROW_MAX_LENGTH, queueEyebrowText, takeQueuedEyebrowText } from './eyebrow-queue'

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
    queueEyebrowText('a'.repeat(EYEBROW_MAX_LENGTH))
    expect(takeQueuedEyebrowText()).toBe('a'.repeat(EYEBROW_MAX_LENGTH))
  })

  it('caps overflow at the limit chars and marks the cut with an ellipsis', () => {
    queueEyebrowText('a'.repeat(EYEBROW_MAX_LENGTH * 2))
    const out = takeQueuedEyebrowText()
    expect(out).toHaveLength(EYEBROW_MAX_LENGTH)
    expect(out?.endsWith('…')).toBe(true)
  })
})
