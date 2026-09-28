import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { Writable } from 'node:stream'
import { StrictMode } from 'react'
import { AppShell } from '../src/App'
import { routesMeta } from '../src/routes/routes.meta'
import { composePage, stylesheetsFor, type StylesheetIndex } from './prerender-html'

export { buildStylesheetIndex } from './prerender-html'

export function renderRoute(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const output = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk))
        callback()
      },
    })

    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <StaticRouter location={path}>
          <AppShell />
        </StaticRouter>
      </StrictMode>,
      {
        onAllReady() {
          pipe(output)
          output.on('finish', () => resolve(Buffer.concat(chunks).toString('utf8')))
        },
        onError(error) {
          reject(error)
        },
      }
    )
  })
}

/**
 * The route's finished index.html. Noindex routes keep the empty root: their content depends on a
 * token in the URL, so prerendering it would only guarantee a hydration mismatch.
 */
export async function prerenderPage(template: string, path: string, index: StylesheetIndex) {
  if (routesMeta[path]?.noindex) return template
  const content = await renderRoute(path)
  return composePage(template, content, stylesheetsFor(template, content, index))
}
