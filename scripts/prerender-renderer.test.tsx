import { describe, expect, it } from 'vitest'
import { renderRoute } from './prerender-renderer'

describe('renderRoute', () => {
  it('renders project links into server HTML', async () => {
    const html = await renderRoute('/projects')

    expect(html).toContain('Nimble Toolbox')
    expect(html).toContain('https://nimbletoolbox.com')
  })
})
