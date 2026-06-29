import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConfirmPage } from './ConfirmPage'
import { routePaths } from '../../../routes/routes.paths'

const res = (status: number) => ({ ok: status < 400, status, json: async () => ({}) }) as Response

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={routePaths.recallRadarConfirm} element={<ConfirmPage />} />
        <Route path={routePaths.recallRadar} element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ConfirmPage', () => {
  it('shows a success message on HTTP 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(200))
    )
    renderAt(`${routePaths.recallRadarConfirm}?token=abc`)
    expect(await screen.findByText(/your subscription is confirmed/i)).toBeTruthy()
  })

  it('shows an expired message on HTTP 410', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(410))
    )
    renderAt(`${routePaths.recallRadarConfirm}?token=abc`)
    expect(await screen.findByText(/has expired/i)).toBeTruthy()
  })

  it('shows an invalid message on HTTP 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(404))
    )
    renderAt(`${routePaths.recallRadarConfirm}?token=abc`)
    expect(await screen.findByText(/invalid or has already been used/i)).toBeTruthy()
  })

  it('redirects to the dashboard when no token is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(200))
    )
    renderAt(routePaths.recallRadarConfirm)
    expect(await screen.findByText('dashboard')).toBeTruthy()
  })
})
