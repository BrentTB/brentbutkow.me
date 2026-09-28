import { afterEach, describe, expect, it } from 'vitest'
import { disableFunMode, enableFunMode } from './modes/fun-mode'
import { shouldHydrate } from './should-hydrate'

const prerenderedRoot = () => {
  const root = document.createElement('div')
  root.innerHTML = '<main>Projects</main>'
  return root
}

afterEach(disableFunMode)

describe('shouldHydrate', () => {
  it('hydrates prerendered HTML in Professional mode', () => {
    expect(shouldHydrate(prerenderedRoot())).toBe(true)
  })

  it('renders fresh in Fun mode, since prerendered HTML is the Professional view', () => {
    enableFunMode()
    expect(shouldHydrate(prerenderedRoot())).toBe(false)
  })

  it('renders fresh into the empty SPA fallback shell', () => {
    expect(shouldHydrate(document.createElement('div'))).toBe(false)
  })
})
