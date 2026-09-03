import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState, type ComponentProps, type ReactElement } from 'react'
import { RecallFeed } from './RecallFeed'
import type { Recall } from '../recall.types'

// RecallFeed renders <Link>s (the per-row "Open recall page" + related recalls), so each render
// needs a Router context. Wrap testing-library's render once rather than at every call site.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

// RecallFeed's open rows are controlled by the parent (RecallRadar lifts them into the URL), so
// most tests drive it through this stateful harness; controlled-behaviour tests pin the props.
function Feed(props: Omit<ComponentProps<typeof RecallFeed>, 'openRows' | 'onRowToggle'>) {
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(new Set())
  return (
    <RecallFeed
      {...props}
      openRows={openRows}
      onRowToggle={(recallNumber, open) =>
        setOpenRows((prev) => {
          const next = new Set(prev)
          if (open) next.add(recallNumber)
          else next.delete(recallNumber)
          return next
        })
      }
    />
  )
}

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

const recall: Recall = {
  country: 'us',
  source: 'usda',
  recallNumber: 'F-1234',
  sourceUrl: 'https://www.fsis.usda.gov/recalls/test',
  status: 'Ongoing',
  classification: 'Class I',
  productDescription: 'Test cookies',
  reasonText: 'Undeclared peanut',
  companyName: 'Acme Foods',
  state: 'CA',
  distributionPattern: 'Nationwide',
  recallInitiationDate: '2026-06-01',
  reportDate: '2026-06-10',
  category: 'allergen',
  categoryConfidence: 0.92,
  severityScore: 91,
  severityLabel: 'severe',
  entities: [{ type: 'allergen', value: 'peanuts' }],
}

describe('RecallFeed', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the product summary and a drill-down with the recall metadata', () => {
    render(<Feed recalls={[recall]} />)
    expect(screen.getByText('Test cookies')).toBeTruthy()
    expect(screen.getByLabelText('Severity: Severe')).toBeTruthy() // color-graded severity dot
    // fields revealed in the expandable detail panel
    expect(screen.getByText('Acme Foods')).toBeTruthy() // company
    expect(screen.getByText('F-1234')).toBeTruthy()
    expect(screen.getByText('Nationwide')).toBeTruthy()
    expect(screen.getByText('USDA FSIS')).toBeTruthy() // source badge
    expect(screen.getByText('View original notice ↗')).toBeTruthy() // source_url link
    expect(screen.getByText('peanuts')).toBeTruthy() // extracted entity chip
  })

  it('shows EU geography as country names, not ISO codes, in a RASFF drill-down', () => {
    const euRecall: Recall = {
      ...recall,
      country: 'eu',
      source: 'rasff',
      recallNumber: '2026.1234',
      state: null,
      classification: null,
      notifyingCountry: 'IE',
      originCountries: ['ES'],
      distributionCountries: ['IE', 'DE'],
    }
    render(<Feed recalls={[euRecall]} />)
    expect(screen.getByText('Notified by')).toBeTruthy()
    expect(screen.getByText('Ireland')).toBeTruthy()
    expect(screen.getByText('Origin')).toBeTruthy()
    expect(screen.getByText('Spain')).toBeTruthy()
    expect(screen.getByText('Distributed to')).toBeTruthy()
    expect(screen.getByText('Ireland, Germany')).toBeTruthy()
    expect(screen.queryByText('IE')).toBeNull() // raw codes never reach the UI
  })

  it('toggles the detail panel open when the summary is clicked', () => {
    const { container } = render(<Feed recalls={[recall]} />)
    const details = container.querySelector('details')
    const summary = container.querySelector('summary')
    expect(details?.open).toBe(false)
    fireEvent.click(summary as Element)
    expect(details?.open).toBe(true)
  })

  it('toggles the row on a plain title click while keeping a real href for new-tab', () => {
    // Opening the row mounts RelatedRecalls, which fetches; stub it so the toggle is all we exercise.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([]))
    )
    const { container } = render(<Feed recalls={[recall]} />)
    const title = screen.getByRole('link', { name: 'Test cookies' })
    // The href stays so a modifier / right click still opens the detail page in a new tab.
    expect(title.getAttribute('href')).toContain('/projects/recall-radar/usda/F-1234')
    // A plain click expands the row instead of navigating away.
    fireEvent.click(title)
    expect(container.querySelector('details')?.open).toBe(true)
    fireEvent.click(title)
    expect(container.querySelector('details')?.open).toBe(false)
  })

  it('mounts related recalls on open and unmounts them on close across a rapid toggle', async () => {
    // Exercises the onToggle add/remove path the rapid-toggle fix lives in: opening adds the row to
    // openRows (mounting RelatedRecalls), closing removes it (unmounting). The crash the fix guards
    // (currentTarget null in the deferred updater) only reproduces in a real browser, not jsdom.
    const fetchMock = vi.fn(async () =>
      mockRes([
        {
          similarity: 0.7,
          recall: { ...recall, recallNumber: 'F-2', productDescription: 'Similar cookies' },
        },
      ])
    )
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<Feed recalls={[recall]} />)
    const details = container.querySelector('details') as HTMLDetailsElement

    details.open = true
    fireEvent(details, new Event('toggle'))
    await waitFor(() => expect(screen.getByText('Similar cookies')).toBeTruthy())

    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(screen.queryByText('Similar cookies')).toBeNull() // closing unmounts related recalls
  })

  it('renders an empty state when there are no recalls', () => {
    render(<Feed recalls={[]} />)
    expect(screen.getByText('No recalls match these filters.')).toBeTruthy()
  })

  it('renders a row expanded when the controlled openRows set contains it', () => {
    // Guards the URL-restore path: a shared ?open= link must render its rows already expanded.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([]))
    )
    const { container } = render(
      <RecallFeed recalls={[recall]} openRows={new Set(['F-1234'])} onRowToggle={vi.fn()} />
    )
    expect(container.querySelector('details')?.open).toBe(true)
  })

  it('reports summary toggles to onRowToggle with the recall number', () => {
    const onRowToggle = vi.fn()
    const { container } = render(
      <RecallFeed recalls={[recall]} openRows={new Set<string>()} onRowToggle={onRowToggle} />
    )
    // jsdom flips `open` on summary click but never fires the toggle event — dispatch it directly.
    const details = container.querySelector('details') as HTMLDetailsElement
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(onRowToggle).toHaveBeenCalledWith('F-1234', true)
  })

  it('shows a theme chip that filters without toggling the row open', () => {
    const onTopicSelect = vi.fn()
    const { container } = render(
      <Feed
        recalls={[{ ...recall, topicId: 2 }]}
        topicsById={
          new Map([
            [
              2,
              {
                id: 2,
                slug: 'listeria-deli-meat',
                label: 'listeria · deli · meat',
                topTerms: ['listeria', 'deli', 'meat'],
                size: 9,
              },
            ],
          ])
        }
        onTopicSelect={onTopicSelect}
      />
    )
    const details = container.querySelector('details')
    fireEvent.click(screen.getByRole('button', { name: 'listeria · deli · meat' }))
    expect(onTopicSelect).toHaveBeenCalledWith('listeria-deli-meat')
    expect(details?.open).toBe(false) // the chip click must not expand the row
  })

  const outbreak = (over = {}) => ({
    id: 5,
    slug: 'listeria-2026-03',
    label: 'Listeria · 7 recalls',
    isOutbreak: true,
    dominantEntity: 'Listeria',
    recallCount: 7,
    companyCount: 3,
    stateCount: 4,
    firstDate: null,
    lastDate: null,
    severityMax: 92,
    ...over,
  })

  it('shows an outbreak badge that filters without toggling the row open', () => {
    const onEventSelect = vi.fn()
    const { container } = render(
      <Feed
        recalls={[{ ...recall, eventClusterId: 5 }]}
        eventsById={new Map([[5, outbreak()]])}
        onEventSelect={onEventSelect}
      />
    )
    const details = container.querySelector('details')
    fireEvent.click(screen.getByRole('button', { name: /Outbreak/i }))
    expect(onEventSelect).toHaveBeenCalledWith('listeria-2026-03')
    expect(details?.open).toBe(false) // the badge click must not expand the row
  })

  it('shows no badge for a recall in a non-outbreak cluster', () => {
    render(
      <Feed
        recalls={[{ ...recall, eventClusterId: 5 }]}
        eventsById={new Map([[5, outbreak({ isOutbreak: false })]])}
        onEventSelect={vi.fn()}
      />
    )
    expect(screen.queryByText('⚠ Outbreak')).toBeNull()
  })

  it('clears the theme filter when its already-active chip is re-clicked', () => {
    const onTopicSelect = vi.fn()
    render(
      <Feed
        recalls={[{ ...recall, topicId: 2 }]}
        topicsById={
          new Map([
            [
              2,
              {
                id: 2,
                slug: 'listeria-deli-meat',
                label: 'listeria · deli · meat',
                topTerms: ['listeria', 'deli', 'meat'],
                size: 9,
              },
            ],
          ])
        }
        onTopicSelect={onTopicSelect}
        activeTopic="listeria-deli-meat"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'listeria · deli · meat' }))
    expect(onTopicSelect).toHaveBeenCalledWith('') // toggles off, not re-set
  })

  it('clears the outbreak filter when its already-active badge is re-clicked', () => {
    const onEventSelect = vi.fn()
    render(
      <Feed
        recalls={[{ ...recall, eventClusterId: 5 }]}
        eventsById={new Map([[5, outbreak()]])}
        onEventSelect={onEventSelect}
        activeEvent="listeria-2026-03"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Outbreak/i }))
    expect(onEventSelect).toHaveBeenCalledWith('')
  })

  it('fetches and renders related recalls only once a row is expanded', async () => {
    const fetchMock = vi.fn(async () =>
      mockRes([
        {
          similarity: 0.7,
          recall: { ...recall, recallNumber: 'F-2', productDescription: 'Similar cookies' },
        },
      ])
    )
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<Feed recalls={[recall]} />)

    expect(fetchMock).not.toHaveBeenCalled() // nothing fetched before expanding

    const details = container.querySelector('details') as HTMLDetailsElement
    details.open = true
    fireEvent(details, new Event('toggle'))

    await waitFor(() => expect(screen.getByText('Similar cookies')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/usda/F-1234/similar'),
      expect.anything()
    )
  })
})
