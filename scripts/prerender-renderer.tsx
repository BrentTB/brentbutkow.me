import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { Writable } from 'node:stream'
import { StrictMode } from 'react'
import { AppShell } from '../src/App'

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
