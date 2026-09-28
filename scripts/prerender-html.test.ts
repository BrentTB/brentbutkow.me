import { describe, expect, it } from 'vitest'
import { buildStylesheetIndex, composePage, stylesheetsFor } from './prerender-html'

const TEMPLATE = `<html>
  <head>
    <link rel="stylesheet" crossorigin href="/assets/index-a.css">
  </head>
  <body><div id="root"></div></body>
</html>`

const index = buildStylesheetIndex([
  { href: '/assets/index-a.css', css: '._shell_ab12c_1{display:grid}._card_zz9zz_4{color:red}' },
  { href: '/assets/Othello-b.css', css: '._board_qq1qq_3:hover{outline:0}.active{color:blue}' },
  { href: '/assets/shared-c.css', css: '._card_zz9zz_4{margin:0}' },
])

describe('stylesheetsFor', () => {
  it('links the lazy stylesheet that defines a rendered CSS-module class', () => {
    const content = '<div class="_shell_ab12c_1"><div class="_board_qq1qq_3">x</div></div>'
    expect(stylesheetsFor(TEMPLATE, content, index)).toEqual(['/assets/Othello-b.css'])
  })

  it('skips classes a stylesheet the template already links defines', () => {
    expect(stylesheetsFor(TEMPLATE, '<a class="_card_zz9zz_4">x</a>', index)).toEqual([])
  })

  it('ignores global class names, which could match another route’s rules', () => {
    expect(stylesheetsFor(TEMPLATE, '<a class="active">x</a>', index)).toEqual([])
  })
})

describe('composePage', () => {
  it('fills the root and links stylesheets before </head>', () => {
    const html = composePage(TEMPLATE, '<main>hi</main>', ['/assets/Othello-b.css'])
    expect(html).toContain('<div id="root"><main>hi</main></div>')
    expect(html).toMatch(/Othello-b\.css">\s*<\/head>/)
  })

  it('inserts content verbatim, even text that looks like a replacement pattern', () => {
    const html = composePage(TEMPLATE, "<p>$& costs $' now</p>", [])
    expect(html).toContain('<div id="root"><p>$& costs $\' now</p></div>')
  })

  it('throws when the template has no empty root', () => {
    expect(() => composePage('<html></html>', 'x', [])).toThrow(/root element not found/)
  })
})
