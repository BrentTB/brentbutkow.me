import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'
import { projects } from './data'

afterEach(cleanup)

describe('ProjectsPage', () => {
  it('links each project at its own href, with no page path prefixed onto it', () => {
    // Fun Stuff rows carry links relative to their list, so FunCard prefixes the current path onto them.
    // Project hrefs are already absolute: prefixing here would give /projects/projects/recall-radar.
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <ProjectsPage />
      </MemoryRouter>
    )

    for (const project of projects) {
      // Substring match, not a RegExp: a name with `+` or brackets in it would be read as syntax.
      const row = screen.getByRole('link', { name: (label) => label.includes(project.name) })
      expect(row.getAttribute('href')).toBe(project.href)
    }
  })

  it('opens a project on its own domain in a new tab, and keeps the rest routing in place', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <ProjectsPage />
      </MemoryRouter>
    )

    for (const project of projects) {
      const row = screen.getByRole('link', { name: (label) => label.includes(project.name) })
      if (project.external) {
        expect(row.getAttribute('target')).toBe('_blank')
        expect(row.getAttribute('rel')).toBe('noopener noreferrer')
      } else {
        expect(row.getAttribute('target')).toBeNull()
      }
    }
  })

  it('gives every project a kind label in the rail', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <ProjectsPage />
      </MemoryRouter>
    )

    // getAllByText: two projects are free to share a label, and one day two of them will.
    for (const project of projects) {
      expect(screen.getAllByText(project.label).length).toBeGreaterThan(0)
    }
  })
})
