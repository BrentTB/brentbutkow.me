import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ManagePage } from './ManagePage'
import { routePaths } from '../../../routes/routes.paths'

const res = (status: number, body: unknown = {}) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

const READY_BODY = {
  email: 's***@e***.com',
  status: 'active',
  countries: ['us'],
  entities: ['peanut'],
  companies: ['acme'],
  categories: ['allergen'],
  min_severity: 'high',
}

type MockOpts = { getStatus?: number; patchStatus?: number; unsubStatus?: number }

const mockFetch = ({ getStatus = 200, patchStatus = 200, unsubStatus = 200 }: MockOpts = {}) =>
  vi.fn(async (url: string, opts?: { method?: string }) => {
    const u = String(url)
    const method = opts?.method ?? 'GET'
    if (u.includes('/subscriptions/unsubscribe')) return res(unsubStatus)
    if (u.includes('/subscriptions/manage')) {
      return method === 'PATCH' ? res(patchStatus) : res(getStatus, READY_BODY)
    }
    return res(404)
  })

const renderManage = () =>
  render(
    <MemoryRouter initialEntries={[`${routePaths.recallRadarManage}?token=tok`]}>
      <ManagePage />
    </MemoryRouter>
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ManagePage', () => {
  it('pre-populates the form from a 200 response and shows the email', async () => {
    vi.stubGlobal('fetch', mockFetch())
    renderManage()
    expect(await screen.findByText('peanut')).toBeTruthy()
    expect(screen.getByText('s***@e***.com')).toBeTruthy()
    const us = screen.getByRole('checkbox', { name: /united states/i }) as HTMLInputElement
    expect(us.checked).toBe(true)
  })

  it('saves preferences via PATCH', async () => {
    vi.stubGlobal('fetch', mockFetch())
    renderManage()
    await screen.findByText('peanut')
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }))
    expect(await screen.findByText(/preferences saved/i)).toBeTruthy()
  })

  it('unsubscribes via POST', async () => {
    vi.stubGlobal('fetch', mockFetch())
    renderManage()
    await screen.findByText('peanut')
    fireEvent.click(screen.getByRole('button', { name: /unsubscribe/i }))
    expect(await screen.findByText(/you have been unsubscribed/i)).toBeTruthy()
  })

  it('shows the unsubscribed message on HTTP 410', async () => {
    vi.stubGlobal('fetch', mockFetch({ getStatus: 410 }))
    renderManage()
    expect(await screen.findByText(/already unsubscribed/i)).toBeTruthy()
  })

  it('shows a not-found message on HTTP 404', async () => {
    vi.stubGlobal('fetch', mockFetch({ getStatus: 404 }))
    renderManage()
    expect(await screen.findByText(/invalid or could not be found/i)).toBeTruthy()
  })
})
