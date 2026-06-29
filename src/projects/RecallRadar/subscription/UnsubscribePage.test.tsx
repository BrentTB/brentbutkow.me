import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UnsubscribePage } from './UnsubscribePage'
import { routePaths } from '../../../routes/routes.paths'

const res = (status: number) => ({ ok: status < 400, status, json: async () => ({}) }) as Response

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={routePaths.recallRadarUnsubscribe} element={<UnsubscribePage />} />
        <Route path={routePaths.recallRadar} element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('UnsubscribePage', () => {
  it('confirms unsubscription on HTTP 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(200))
    )
    renderAt(`${routePaths.recallRadarUnsubscribe}?token=abc`)
    expect(await screen.findByText(/you’re unsubscribed/i)).toBeTruthy()
  })

  it('shows the already-unsubscribed message on HTTP 410', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(410))
    )
    renderAt(`${routePaths.recallRadarUnsubscribe}?token=abc`)
    expect(await screen.findByText(/already unsubscribed/i)).toBeTruthy()
  })

  it('shows an invalid message on HTTP 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(404))
    )
    renderAt(`${routePaths.recallRadarUnsubscribe}?token=abc`)
    expect(await screen.findByText(/isn’t valid/i)).toBeTruthy()
  })

  it('redirects to the dashboard when no token is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(200))
    )
    renderAt(routePaths.recallRadarUnsubscribe)
    expect(await screen.findByText('dashboard')).toBeTruthy()
  })
})
