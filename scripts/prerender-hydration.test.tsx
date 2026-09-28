import { act, StrictMode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../src/App'
import { createInitialState } from '../src/projects/NullSpace/engine/game-loop'
import { rng } from '../src/projects/NullSpace/engine/math/random'
import {
  DEFAULT_CHANGELOG_FILTERS,
  saveChangelogFilters,
  saveGame,
  saveTutorialSeen,
} from '../src/projects/NullSpace/engine/world/persistence'
import { FlipSpeed, MoveCommit as OthelloMoveCommit } from '../src/projects/Othello/othello.types'
import { FLIP_SPEED_KEY } from '../src/projects/Othello/useFlipSpeed'
import { MOVE_COMMIT_KEY as OTHELLO_MOVE_COMMIT_KEY } from '../src/projects/Othello/useMoveCommit'
import {
  DEFAULT_SETTINGS,
  FAVOURITES_KEY,
  SETTINGS_KEY,
} from '../src/projects/PixelWorldSimulator/data'
import { MaterialId } from '../src/projects/PixelWorldSimulator/pixel-world.types'
import { MoveCommit } from '../src/projects/TicTacToe/tic-tac-toe.types'
import { MOVE_COMMIT_KEY } from '../src/projects/TicTacToe/useMoveCommit'
import { browsableRoutePaths } from '../src/routes/routes.meta'
import { renderRoute } from './prerender-renderer'

// A phone browser that matches every media query (coarse pointer, reduced motion, narrow viewport),
// installed only after the server render — so any component reading the browser in its first client
// render diverges from the prerendered HTML and fails hydration here instead of in production.
// ResizeObserver is a no-op jsdom lacks, needed by the canvas games once they hydrate.
function stubPhoneBrowser() {
  const matchMedia = (media: string) => ({
    matches: true,
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
  vi.stubGlobal('matchMedia', matchMedia)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
}

// A returning visitor: every saved preference and game differs from its default, so any component that
// reads storage during its first render shows something the prerendered HTML doesn't.
function seedReturningVisitor() {
  saveGame(createInitialState(), rng.getState())
  saveTutorialSeen()
  saveChangelogFilters({
    ...DEFAULT_CHANGELOG_FILTERS,
    balance: !DEFAULT_CHANGELOG_FILTERS.balance,
  })
  const flippedSettings = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([setting, on]) => [setting, !on])
  )
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(flippedSettings))
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(Object.values(MaterialId).slice(1, 4)))
  localStorage.setItem(MOVE_COMMIT_KEY, MoveCommit.confirm)
  localStorage.setItem(OTHELLO_MOVE_COMMIT_KEY, OthelloMoveCommit.confirm)
  localStorage.setItem(FLIP_SPEED_KEY, FlipSpeed.slow)
}

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
})

// Hydrates the client app over the route's prerendered HTML and returns every mismatch: recoverable
// errors (React threw the server HTML away and re-rendered) and attribute mismatch warnings (React kept
// the server's stale attribute, e.g. a wrong aria-pressed, and never corrects it).
async function hydrationErrors(path: string, beforeHydrate: () => void = () => {}) {
  const container = document.createElement('div')
  container.innerHTML = await renderRoute(path)
  // React's server renderer can leave router context set after resuming a lazy route; in production
  // server and client never share a process, so render an eager route to reset it before hydrating.
  await renderRoute('/experience')
  document.body.appendChild(container)
  stubPhoneBrowser()
  beforeHydrate()

  const mismatches: string[] = []
  const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = args.map(String).join(' ')
    if (message.includes('did not match')) mismatches.push(message.split('\n')[0])
  })
  await act(async () => {
    root = hydrateRoot(
      container,
      <StrictMode>
        <MemoryRouter initialEntries={[path]}>
          <AppShell />
        </MemoryRouter>
      </StrictMode>,
      { onRecoverableError: (error) => mismatches.push(String(error)) }
    )
    await vi.dynamicImportSettled()
  })
  consoleError.mockRestore()
  return mismatches
}

describe('prerendered routes hydrate without React discarding the server HTML', () => {
  it.each(browsableRoutePaths)('%s', async (path) => {
    expect(await hydrationErrors(path)).toEqual([])
  })

  it.each(browsableRoutePaths)(
    '%s, for a returning visitor with saved preferences',
    async (path) => {
      expect(await hydrationErrors(path, seedReturningVisitor)).toEqual([])
    }
  )
})
