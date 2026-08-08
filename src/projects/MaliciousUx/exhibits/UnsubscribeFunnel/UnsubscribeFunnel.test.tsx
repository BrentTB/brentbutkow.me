import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FUNNEL_ORDER } from '../../engine/unsubscribe-funnel'
import { copy } from './data'
import { UnsubscribeFunnel } from './UnsubscribeFunnel'

afterEach(cleanup)

// A question renders the stay button first, then the leave button, whatever their per-step labels.
const pressStay = () => fireEvent.click(screen.getAllByRole('button')[0])
const pressLeave = () => fireEvent.click(screen.getAllByRole('button')[1])

describe('UnsubscribeFunnel', () => {
  it('opens on the full screen count the page never admits to', () => {
    render(<UnsubscribeFunnel />)

    expect(screen.getByText(copy.countdown(FUNNEL_ORDER.length))).toBeTruthy()
  })

  it('counts one screen down for every step deeper', () => {
    render(<UnsubscribeFunnel />)

    pressLeave()

    expect(screen.getByText(copy.countdown(FUNNEL_ORDER.length - 1))).toBeTruthy()
  })

  it('only unsubscribes after every screen has been cleared', () => {
    render(<UnsubscribeFunnel />)

    for (let step = 0; step < FUNNEL_ORDER.length; step += 1) pressLeave()

    expect(screen.getByText(copy.gone(FUNNEL_ORDER.length))).toBeTruthy()
  })

  it('keeps the subscription the moment you take the friendlier button', () => {
    render(<UnsubscribeFunnel />)

    pressStay()

    expect(screen.getByText(copy.kept)).toBeTruthy()
  })

  it('starts over from the top on resubscribe', () => {
    render(<UnsubscribeFunnel />)
    pressStay()

    fireEvent.click(screen.getByRole('button', { name: copy.again }))

    expect(screen.getByText(copy.countdown(FUNNEL_ORDER.length))).toBeTruthy()
  })
})
