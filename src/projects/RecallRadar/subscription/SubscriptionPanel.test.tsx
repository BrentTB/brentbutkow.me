import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SubscriptionPanel } from './SubscriptionPanel'

// The company type-ahead and submit() both call fetch; the company fetch can return anything (it
// just feeds suggestions), so a single status drives the submit assertions.
const routeFetch = (subscribeStatus: number) =>
  vi.fn(
    async () =>
      ({
        ok: subscribeStatus < 400,
        status: subscribeStatus,
        json: async () => ({}),
      }) as Response
  )

const open = () => fireEvent.click(screen.getByRole('button', { name: /get recall alerts/i }))

const fillValid = () => {
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: 'subscriber@example.com' },
  })
  const entity = screen.getByLabelText('Add an allergen, pathogen, or hazard')
  fireEvent.change(entity, { target: { value: 'peanut' } })
  fireEvent.keyDown(entity, { key: 'Enter' })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SubscriptionPanel', () => {
  beforeEach(() => vi.stubGlobal('fetch', routeFetch(201)))

  it('shows the disclaimer before the form is submitted', () => {
    render(<SubscriptionPanel country="us" />)
    open()
    expect(screen.getByText(/best-effort and sent via a free service/i)).toBeTruthy()
  })

  it('renders all six filter field types', () => {
    render(<SubscriptionPanel country="us" />)
    open()
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy() // email
    expect(screen.getByText('United States')).toBeTruthy() // countries
    expect(screen.getByLabelText('Add an allergen, pathogen, or hazard')).toBeTruthy() // entities
    expect(screen.getByRole('combobox', { name: 'Company' })).toBeTruthy() // company
    expect(screen.getByText('Undeclared allergen')).toBeTruthy() // categories
    expect(screen.getByText('Minimum severity')).toBeTruthy() // severity
  })

  it('renders the confirmation copy after a successful submit', async () => {
    render(<SubscriptionPanel country="us" />)
    open()
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }))
    expect(await screen.findByText(/check your email/i)).toBeTruthy()
  })

  it('renders the duplicate message when the API returns 409', async () => {
    vi.stubGlobal('fetch', routeFetch(409))
    render(<SubscriptionPanel country="us" />)
    open()
    fillValid()
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }))
    expect(await screen.findByText(/already have an active subscription/i)).toBeTruthy()
  })
})
