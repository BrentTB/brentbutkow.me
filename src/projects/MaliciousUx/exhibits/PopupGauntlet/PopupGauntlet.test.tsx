import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { INTERRUPTION_DEPTHS } from '../../engine/scroll-triggers'
import { AD_AFTER_INTERRUPTIONS, copy, INTERRUPTIONS } from './data'
import { PopupGauntlet } from './PopupGauntlet'

afterEach(cleanup)

const SCROLL_HEIGHT = 700
const CLIENT_HEIGHT = 220
const SCROLLABLE = SCROLL_HEIGHT - CLIENT_HEIGHT

const article = () => screen.getByTestId('gauntlet-article')

/**
 * Scrolls the article frame to a fraction of its scrollable distance. `scrollTop` is stubbed as a
 * writable property on purpose: jsdom leaves a value-only descriptor read-only, and the component
 * legitimately resets it to zero when the article starts over.
 */
const scrollTo = (depth: number) => {
  const frame = article()
  Object.defineProperty(frame, 'scrollHeight', { value: SCROLL_HEIGHT, configurable: true })
  Object.defineProperty(frame, 'clientHeight', { value: CLIENT_HEIGHT, configurable: true })
  Object.defineProperty(frame, 'scrollTop', {
    value: SCROLLABLE * depth,
    writable: true,
    configurable: true,
  })
  fireEvent.scroll(frame)
}

const dismiss = (index: number) =>
  fireEvent.click(screen.getByRole('button', { name: INTERRUPTIONS[index].dismiss }))

describe('PopupGauntlet', () => {
  it('leaves the reader alone until they make progress', () => {
    render(<PopupGauntlet />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(copy.quiet)).toBeTruthy()
  })

  it('interrupts once the first depth is reached', () => {
    render(<PopupGauntlet />)

    scrollTo(INTERRUPTION_DEPTHS[0])

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(INTERRUPTIONS[0].heading)).toBeTruthy()
  })

  /** Reading on past the popup was the escape hatch: scrolling straight past all three cost nothing. */
  it('freezes the article while a popup is up, and thaws it on dismissal', () => {
    render(<PopupGauntlet />)

    scrollTo(INTERRUPTION_DEPTHS[0])
    expect(article().dataset.locked).toBe('true')

    dismiss(0)
    expect(article().dataset.locked).toBe('false')
  })

  it('spends each depth once, so dismissing does not summon the same one again', () => {
    render(<PopupGauntlet />)

    scrollTo(INTERRUPTION_DEPTHS[0])
    dismiss(0)
    scrollTo(INTERRUPTION_DEPTHS[0])

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('brings the advert in once enough interruptions have landed', () => {
    render(<PopupGauntlet />)
    expect(screen.queryByText(copy.advertBody)).toBeNull()

    for (let index = 0; index < AD_AFTER_INTERRUPTIONS; index += 1) {
      scrollTo(INTERRUPTION_DEPTHS[index])
      dismiss(index)
    }

    expect(screen.getByText(copy.advertBody)).toBeTruthy()
  })

  /** Flinging the scrollbar to the bottom skips the triggers; the article is not finished then. */
  it('does not claim the end was reached while interruptions are still owed', () => {
    render(<PopupGauntlet />)

    scrollTo(1)

    expect(screen.queryByText(copy.finished(INTERRUPTIONS.length))).toBeNull()
  })

  it('reports the end once every interruption has been paid for', () => {
    render(<PopupGauntlet />)

    INTERRUPTION_DEPTHS.forEach((depth, index) => {
      scrollTo(depth)
      dismiss(index)
    })
    scrollTo(1)

    expect(screen.getByText(copy.finished(INTERRUPTIONS.length))).toBeTruthy()
  })

  it('reports the end even when the last interruption fires at the very bottom', () => {
    render(<PopupGauntlet />)

    scrollTo(INTERRUPTION_DEPTHS[0])
    dismiss(0)
    scrollTo(INTERRUPTION_DEPTHS[1])
    dismiss(1)
    // Fling straight to the bottom: the final interruption and the end land on one scroll event.
    scrollTo(1)
    dismiss(2)

    expect(screen.getByText(copy.finished(INTERRUPTIONS.length))).toBeTruthy()
  })

  it('has one popup defined for every interruption depth', () => {
    expect(INTERRUPTIONS.length).toBe(INTERRUPTION_DEPTHS.length)
  })

  it('starts the article over, back at the top', () => {
    render(<PopupGauntlet />)
    INTERRUPTION_DEPTHS.forEach((depth, index) => {
      scrollTo(depth)
      dismiss(index)
    })

    fireEvent.click(screen.getByRole('button', { name: copy.again }))

    expect(screen.getByText(copy.quiet)).toBeTruthy()
    expect(screen.queryByText(copy.advertBody)).toBeNull()
    expect(article().scrollTop).toBe(0)
  })
})
