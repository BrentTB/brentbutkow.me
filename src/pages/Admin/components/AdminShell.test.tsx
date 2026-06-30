import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AdminShell } from './AdminShell'
import { AdminAuthContext } from '../useAdminContext'
import { AdminAuth, AdminAuthStatus } from '../useAdminAuth'
import { Overview } from '../admin.types'

const overview: Overview = {
  messages: { total: 3, real: 2, bot: 1 },
  subscriptions: { total: 5, active: 3, pendingConfirmation: 1, paused: 0, unsubscribed: 1 },
  ingest: null,
  recalls: { total: 9, us: 5, uk: 3, za: 1 },
  nullspace: { total: 42, legit: 40, flagged: 2 },
}

// Resolves each admin path with a shape its validator accepts.
const request = (async (path: string) => {
  if (path.startsWith('/admin/overview')) return overview
  return { items: [], total: 0 }
}) as AdminAuth['request']

const auth: AdminAuth = {
  token: 'tok',
  status: AdminAuthStatus.idle,
  login: async () => {},
  logout: () => {},
  request,
}

function LocationProbe() {
  return <div data-testid="search">{useLocation().search}</div>
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminAuthContext.Provider value={auth}>
        <AdminShell />
      </AdminAuthContext.Provider>
      <LocationProbe />
    </MemoryRouter>
  )
}

const search = () => screen.getByTestId('search').textContent
const tabButton = (name: string) =>
  within(screen.getByRole('navigation', { name: 'Admin sections' })).getByRole('button', { name })

describe('AdminShell tab navigation', () => {
  afterEach(cleanup)

  it('starts on Overview with no tab param in the URL', async () => {
    renderShell()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open Messages' })).toBeTruthy())
    expect(search()).toBe('')
  })

  it('reflects the active tab in the ?tab= query param', () => {
    renderShell()
    fireEvent.click(tabButton('Subscriptions'))
    expect(search()).toBe('?tab=subscriptions')
  })

  it('opens a tab when its overview card is clicked', async () => {
    renderShell()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open Messages' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Open Messages' }))

    expect(search()).toBe('?tab=messages')
    expect(screen.getByText('Include bot and spam')).toBeTruthy()
  })

  it('deep-links the flagged count to a pre-filtered Null Space view', async () => {
    renderShell()
    await waitFor(() => expect(screen.getByRole('button', { name: '2' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '2' }))

    expect(search()).toContain('tab=nullspace')
    expect(search()).toContain('score=flagged')
  })
})
