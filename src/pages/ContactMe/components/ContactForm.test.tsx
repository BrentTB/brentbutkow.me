import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ContactForm } from './ContactForm'

const okRes = { ok: true, status: 200, json: async () => ({ status: 'ok' }) } as Response

describe('ContactForm', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('submits a typed message and shows a success note', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okRes)
    )
    render(<ContactForm />)

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi Brent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => expect(screen.getByText('Thanks, your message was sent.')).toBeTruthy())
  })

  it('disables submit until a message is entered', () => {
    render(<ContactForm />)
    const button = screen.getByRole('button', { name: 'Send message' })
    expect(button.hasAttribute('disabled')).toBe(true)
  })
})
