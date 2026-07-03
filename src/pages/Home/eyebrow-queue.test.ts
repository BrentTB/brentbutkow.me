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
})
