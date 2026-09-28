// Post-build step: renders the app into every route's index.html emitted by prerender-plugin.ts, so
// crawlers that don't run JS see the page content. Runs against the SSR bundle of
// prerender-renderer.tsx; the HTML composition itself lives (and is tested) in prerender-html.ts.
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { buildStylesheetIndex, prerenderPage } from '../dist/prerender-server/prerender-renderer.js'

const distDir = 'dist'
const serverDir = join(distDir, 'prerender-server')
const assetsDir = join(distDir, 'assets')

async function findIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (path !== serverDir) files.push(...(await findIndexFiles(path)))
    } else if (entry.name === 'index.html') {
      files.push(path)
    }
  }

  return files
}

function routeFromFile(file) {
  const directory = dirname(relative(distDir, file))
  return directory === '.' ? '/' : `/${directory.split(sep).join('/')}`
}

async function readStylesheets() {
  const names = (await readdir(assetsDir)).filter((name) => name.endsWith('.css'))
  return Promise.all(
    names.map(async (name) => ({
      href: `/assets/${name}`,
      css: await readFile(join(assetsDir, name), 'utf8'),
    }))
  )
}

try {
  const index = buildStylesheetIndex(await readStylesheets())
  const files = await findIndexFiles(distDir)
  for (const file of files) {
    const template = await readFile(file, 'utf8')
    await writeFile(file, await prerenderPage(template, routeFromFile(file), index))
  }
  console.log(`prerender-pages: rendered ${files.length} route pages`)
} finally {
  await rm(serverDir, { recursive: true, force: true })
}
