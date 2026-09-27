import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { renderRoute } from '../dist/prerender-server/prerender-renderer.js'

const distDir = 'dist'

async function findIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'prerender-server') files.push(...(await findIndexFiles(path)))
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

const files = await findIndexFiles(distDir)
for (const file of files) {
  const template = await readFile(file, 'utf8')
  const route = routeFromFile(file)
  const content = await renderRoute(route)
  const root = '<div id="root"></div>'

  if (!template.includes(root)) {
    throw new Error(`prerender: root element not found in ${file}`)
  }

  await writeFile(file, template.replace(root, `<div id="root">${content}</div>`))
}

console.log(`prerender-pages: rendered ${files.length} route pages`)
await rm('dist/prerender-server', { recursive: true, force: true })
