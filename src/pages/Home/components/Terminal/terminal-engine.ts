import { routePaths } from '../../../../routes/routes.paths'
import { routesMeta } from '../../../../routes/routes.meta'
import { funStuffSubRoutes } from '../../../FunStuff/data'
import { gamesSubRoutes } from '../../../FunStuff/subpages/Games/data'

// The virtual filesystem is the public route tree — one node per page a visitor can browse to.
// Private, redirect-only, and dynamic-param routes stay out.
export type TerminalPage = {
  name: string
  path: string
  children: TerminalPage[]
}

const gamesPath = `${routePaths.funStuff}${funStuffSubRoutes.games}`

const browsablePaths = [
  routePaths.experience,
  routePaths.education,
  routePaths.achievements,
  routePaths.projects,
  routePaths.recallRadar,
  routePaths.funStuff,
  `${routePaths.funStuff}${funStuffSubRoutes.asciiArt}`,
  `${routePaths.funStuff}${funStuffSubRoutes.imageEncoder}`,
  `${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`,
  `${routePaths.funStuff}${funStuffSubRoutes.courseProjects}`,
  gamesPath,
  `${gamesPath}${gamesSubRoutes.nullSpace}`,
  routePaths.contact,
]

function buildTree(paths: string[]): TerminalPage[] {
  const root: TerminalPage[] = []
  for (const path of paths) {
    const segments = path.split('/').filter(Boolean)
    let level = root
    let currentPath = ''
    for (const segment of segments) {
      currentPath += `/${segment}`
      let node = level.find((page) => page.name === segment)
      if (!node) {
        node = { name: segment, path: currentPath, children: [] }
        level.push(node)
      }
      level = node.children
    }
  }
  return root
}

export const terminalPages: TerminalPage[] = buildTree(browsablePaths)

export const TerminalCommand = {
  help: 'help',
  ls: 'ls',
  tree: 'tree',
  cd: 'cd',
  open: 'open',
  goto: 'goto',
  pwd: 'pwd',
  joke: 'joke',
  clear: 'clear',
  exit: 'exit',
  whoami: 'whoami',
  sudo: 'sudo',
  fun: 'fun',
  cat: 'cat',
  rm: 'rm',
  echo: 'echo',
  try: 'try',
} as const
export type TerminalCommand = (typeof TerminalCommand)[keyof typeof TerminalCommand]

// Commands offered by help + Tab — easter eggs stay discoverable, not advertised.
const publicCommands = [
  TerminalCommand.help,
  TerminalCommand.ls,
  TerminalCommand.tree,
  TerminalCommand.cd,
  TerminalCommand.cat,
  TerminalCommand.pwd,
  TerminalCommand.joke,
  TerminalCommand.clear,
  TerminalCommand.exit,
]

export const TerminalActionType = {
  navigate: 'navigate',
  back: 'back',
  openExternal: 'openExternal',
  toggleFun: 'toggleFun',
  downloadCv: 'downloadCv',
  clear: 'clear',
  exit: 'exit',
  none: 'none',
} as const
export type TerminalActionType = (typeof TerminalActionType)[keyof typeof TerminalActionType]

export type TerminalAction = {
  type: TerminalActionType
  path?: string
}

export type TerminalResult = {
  output: string[]
  action: TerminalAction
}

export type TerminalContext = {
  isFunMode: boolean
  cvHref: string | null
  pickJoke: () => string
}

const none: TerminalAction = { type: TerminalActionType.none }

const hasFlag = (args: string[], letter: string): boolean =>
  args.some((arg) => /^-[a-zA-Z]+$/.test(arg) && arg.includes(letter))

const HIDDEN_FILE = '.the-game'

// The classic hidden-folder gag — catting it opens the official upload in a new tab.
const RICKROLL_FILE = '.homework'
const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

const hiddenFiles = [RICKROLL_FILE, HIDDEN_FILE]

// `rm -rf /` lands on the 404 page — any unknown path hits the catch-all route.
const RM_CRASH_PATH = '/everything-is-gone'

const HELP_LINES = [
  'help          this list',
  'ls [page]     list pages here',
  'tree          the full page tree',
  'cd <page>     go to a page (Tab completes)',
  'cat <page>    a page in one line',
  'pwd           where you are',
  'joke          one dad joke, on the house',
  'clear         wipe the screen',
  'exit          close the terminal',
  "and a few more you'll have to find yourself",
]

function findPage(segments: string[]): TerminalPage | null {
  let level = terminalPages
  let node: TerminalPage | null = null
  for (const segment of segments) {
    node = level.find((page) => page.name === segment) ?? null
    if (!node) return null
    level = node.children
  }
  return node
}

// Resolves a user-typed path ('projects', '/fun-stuff/games', '~/contact', '..') to segments.
// Returns null when the path walks above the root.
function toSegments(rawPath: string): string[] | null {
  const trimmed = rawPath.replace(/^~/, '')
  const segments: string[] = []
  for (const part of trimmed.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(part)
  }
  return segments
}

function listPages(pathArg: string | undefined, showHidden: boolean): string[] {
  let children = terminalPages
  if (pathArg) {
    const segments = toSegments(pathArg)
    const node = segments ? findPage(segments) : null
    if (segments && segments.length === 0) {
      // Explicit root ('/', '~') — keep the top-level listing.
    } else if (!node) {
      return [`ls: ${pathArg}: no such page`]
    } else if (node.children.length === 0) {
      return [node.name]
    } else {
      children = node.children
    }
  }
  const names = children.map((page) => (page.children.length > 0 ? `${page.name}/` : page.name))
  if (showHidden) names.unshift(...hiddenFiles)
  return [names.join('  ')]
}

function renderTree(pages: TerminalPage[], prefix: string, lines: string[]): void {
  pages.forEach((page, index) => {
    const isLast = index === pages.length - 1
    const name = page.children.length > 0 ? `${page.name}/` : page.name
    lines.push(`${prefix}${isLast ? '└── ' : '├── '}${name}`)
    renderTree(page.children, `${prefix}${isLast ? '    ' : '│   '}`, lines)
  })
}

function treePages(showHidden: boolean): string[] {
  const roots = showHidden
    ? [...hiddenFiles.map((name) => ({ name, path: '', children: [] })), ...terminalPages]
    : terminalPages
  const lines = ['.']
  renderTree(roots, '', lines)
  return lines
}

function changePage(pathArg: string | undefined): TerminalResult {
  if (!pathArg || pathArg === '~' || pathArg === '/') {
    return { output: ['you are already home'], action: none }
  }
  if (pathArg === '-') {
    return { output: [], action: { type: TerminalActionType.back } }
  }
  const segments = toSegments(pathArg)
  if (segments && segments.length === 0) {
    return { output: ['you are already home'], action: none }
  }
  if (!segments) {
    return { output: ['cd: already at the top level'], action: none }
  }
  const node = findPage(segments)
  if (!node) {
    return { output: [`cd: ${pathArg}: no such page (try 'ls')`], action: none }
  }
  return { output: [], action: { type: TerminalActionType.navigate, path: node.path } }
}

function catFile(fileArg: string | undefined, ctx: TerminalContext): TerminalResult {
  if (!fileArg) {
    return { output: ['cat: missing file name'], action: none }
  }
  if (fileArg === 'cv.pdf') {
    if (ctx.cvHref) {
      return { output: ['downloading cv.pdf…'], action: { type: TerminalActionType.downloadCv } }
    }
    return { output: ['cat: cv.pdf: no such file (yet)'], action: none }
  }
  if (fileArg === HIDDEN_FILE) {
    return { output: ['You just lost the game.'], action: none }
  }
  if (fileArg === RICKROLL_FILE) {
    return {
      output: [`opening ${RICKROLL_FILE}…`],
      action: { type: TerminalActionType.openExternal, path: RICKROLL_URL },
    }
  }
  // Catting a page prints its one-line description — the same one search engines see.
  const segments = toSegments(fileArg)
  const page = segments && segments.length > 0 ? findPage(segments) : null
  const description = page ? routesMeta[page.path]?.description : undefined
  if (description) {
    return { output: [description], action: none }
  }
  return { output: [`cat: ${fileArg}: no such file`], action: none }
}

// Every spelling of "delete everything" — cwd is always the site root, so '.', '*', and '~'
// forms all point at the same thing '/' does.
const nukeTargets = ['/', '/*', '.', './', './*', '*', '~', '~/', '~/*']

function removeFile(args: string[]): TerminalResult {
  const flags = args.filter((arg) => arg.startsWith('-'))
  const target = args.find((arg) => !arg.startsWith('-'))
  const recursive = flags.some((flag) => /^-[rf]+$/.test(flag) && flag.includes('r'))
  if (target && nukeTargets.includes(target) && recursive) {
    return {
      output: [`removing ${target}…`],
      action: { type: TerminalActionType.navigate, path: RM_CRASH_PATH },
    }
  }
  if (!target) {
    return { output: ['rm: missing file name'], action: none }
  }
  return { output: [`rm: cannot remove '${target}': this site is read-only`], action: none }
}

export function execute(rawInput: string, ctx: TerminalContext): TerminalResult {
  const tokens = rawInput.trim().split(/\s+/)
  const [command, ...args] = tokens
  if (!command) return { output: [], action: none }

  switch (command) {
    case TerminalCommand.help:
      return { output: HELP_LINES, action: none }
    case TerminalCommand.ls:
      // -R is ls's spelling of the tree view.
      return {
        output: hasFlag(args, 'R')
          ? treePages(hasFlag(args, 'a'))
          : listPages(
              args.find((arg) => !arg.startsWith('-')),
              hasFlag(args, 'a')
            ),
        action: none,
      }
    case TerminalCommand.tree:
      return { output: treePages(hasFlag(args, 'a')), action: none }
    case TerminalCommand.cd:
    case TerminalCommand.open:
    case TerminalCommand.goto:
      return changePage(args[0])
    case TerminalCommand.pwd:
      return { output: ['~ - the home page'], action: none }
    case TerminalCommand.joke:
      return { output: [ctx.pickJoke()], action: none }
    case TerminalCommand.clear:
      return { output: [], action: { type: TerminalActionType.clear } }
    case TerminalCommand.exit:
      return { output: [], action: { type: TerminalActionType.exit } }
    case TerminalCommand.whoami:
      return {
        output: [ctx.isFunMode ? 'Full snack engineer' : 'Brent Butkow - full-stack engineer'],
        action: none,
      }
    case TerminalCommand.sudo:
      return {
        output: [
          /^make[- ]me[- ]a[- ]sandwich$/.test(args.join(' ')) // xkcd 149
            ? 'Okay.'
            : 'you are not in the sudoers file. This incident will be reported.',
        ],
        action: none,
      }
    case TerminalCommand.fun:
      return {
        output: [ctx.isFunMode ? 'Back to business.' : 'Fun mode on. Things may wobble.'],
        action: { type: TerminalActionType.toggleFun },
      }
    case TerminalCommand.cat:
      return catFile(args[0], ctx)
    case TerminalCommand.rm:
      return removeFile(args)
    case TerminalCommand.echo:
      return { output: [args.join(' ')], action: none }
    case TerminalCommand.try:
      // Pays off the input placeholder — typing `try 'help'` literally instead of `help`.
      if (args.join(' ').replace(/['"]/g, '') === 'help') {
        return { output: ['real funny.'], action: none }
      }
      return { output: [`command not found: ${command} (try 'help')`], action: none }
    default:
      return { output: [`command not found: ${command} (try 'help')`], action: none }
  }
}

const pathCommands: string[] = [
  TerminalCommand.cd,
  TerminalCommand.open,
  TerminalCommand.goto,
  TerminalCommand.ls,
  TerminalCommand.cat,
]

// Files cat can read at the root, offered alongside pages. Dotfiles stay out of suggestions
// until the typed partial starts with '.' — same convention as a real shell.
const catFiles = ['cv.pdf', ...hiddenFiles]

// Full-input completions for the current text, best match first. Completing a page that has
// children appends '/' so the next Tab keeps digging.
export function completions(input: string): string[] {
  if (input.trim() === '' || input !== input.trimStart()) return []
  const tokens = input.split(/\s+/)

  if (tokens.length === 1) {
    return publicCommands
      .filter((command) => command.startsWith(tokens[0]) && command !== tokens[0])
      .sort()
      .map((command) => `${command} `)
  }

  const [command, ...args] = tokens
  const pathArg = args[args.length - 1]
  if (!pathCommands.includes(command) || pathArg.startsWith('-')) return []

  // Split the arg at the last '/': everything before resolves as the parent, the tail is the
  // name still being typed — kept verbatim so '.' never silently vanishes into a match-all.
  const partial = pathArg === '~' ? '' : pathArg.slice(pathArg.lastIndexOf('/') + 1)
  const base = pathArg === '~' ? `${input}/` : input.slice(0, input.length - partial.length)
  const parentSegments = toSegments(pathArg.slice(0, pathArg.length - partial.length))
  if (!parentSegments) return []
  const parent = parentSegments.length === 0 ? null : findPage(parentSegments)
  const level = parentSegments.length === 0 ? terminalPages : (parent?.children ?? [])

  const pageMatches = level
    .filter((page) => page.name.startsWith(partial) && page.name !== partial)
    .map((page) => `${base}${page.name}${page.children.length > 0 ? '/' : ''}`)

  const fileMatches =
    command === TerminalCommand.cat && parentSegments.length === 0
      ? catFiles
          .filter((name) => name.startsWith(partial) && name !== partial)
          .filter((name) => !name.startsWith('.') || partial.startsWith('.'))
          .map((name) => `${base}${name}`)
      : []

  return [...pageMatches, ...fileMatches].sort()
}
