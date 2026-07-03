import { routePaths } from '../../../../routes/routes.paths'
import { routesMeta } from '../../../../routes/routes.meta'
import { funStuffSubRoutes } from '../../../FunStuff/data'
import { gamesSubRoutes } from '../../../FunStuff/subpages/Games/data'
import { STEAM_LOCOMOTIVE, cowsay } from './ascii'

// ─── Command index ────────────────────────────────────────────────────────────
//
// Everyday commands (listed in `help`, Tab-completable):
//   help                 the command list
//   ls [page]            pages at a level · -a adds hidden files · -R renders the tree
//   tree                 the full page tree · -a adds hidden files
//   cd <page>            navigate — relative paths, ~, .., and `cd -` (back); aliases: open, goto
//   cat <page>           the page's one-line description (from routes.meta) · cat cv.pdf downloads the CV
//   pwd                  where you are
//   joke                 a dad joke — shuffled round-robin; racier ones stay out of professional mode
//   clear / exit         wipe the log / close the terminal
//   Input UX: Tab ghost-completion, ↑/↓ history, `/` or `~` focuses, Esc closes
//
// Unlisted but ordinary (works, just not in `help`/Tab):
//   pwd                  prints "~ - the home page" — real, but too trivial to advertise
//   echo <text>          echoes it back — a real shell built-in, not an egg
//
// Easter eggs (undocumented in `help`, not Tab-completed):
//   whoami                        mode-dependent identity (full-stack → full-snack in fun mode)
//   make-me-a-sandwich            "What? Make it yourself." — the xkcd 149 setup
//   sudo make-me-a-sandwich       "Okay." — the punchline; any other sudo gets the sudoers warning
//   fun                           flips the Fun-mode toggle
//   rm -rf / (or . ./* * ~ …)     fake delete, then lands on the 404 page
//   ls -a / tree -a               reveal the hidden files below
//   cat .the-game                 "You just lost the game."
//   cat .homework                 rickroll — opens the official video in a new tab
//   cat .eyebrow                  explains the write below
//   echo <text> > .eyebrow        queues <text> as the hero's next typed eyebrow line (one-shot);
//                                 the `>` redirect target Tab-completes to .eyebrow
//   try 'help'                    typing the placeholder literally → "real funny."
//   sl                            the ls typo → a steam locomotive chugs across the log
//   cowsay <text>                 an ASCII cow says <text> (defaults to "moo")
// ──────────────────────────────────────────────────────────────────────────────

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
  sl: 'sl',
  cowsay: 'cowsay',
} as const
export type TerminalCommand = (typeof TerminalCommand)[keyof typeof TerminalCommand]

// Commands offered by help + Tab — easter eggs stay discoverable, not advertised.
const publicCommands = [
  TerminalCommand.help,
  TerminalCommand.ls,
  TerminalCommand.tree,
  TerminalCommand.cd,
  TerminalCommand.cat,
  TerminalCommand.joke,
  TerminalCommand.clear,
  TerminalCommand.exit,
]

export const TerminalActionType = {
  navigate: 'navigate',
  back: 'back',
  openExternal: 'openExternal',
  setEyebrow: 'setEyebrow',
  animate: 'animate',
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
  text?: string
}

export type TerminalResult = {
  output: string[]
  action: TerminalAction
  // Render the output as monospace art (no wrapping, its own x-scroll) rather than prose.
  art?: boolean
}

export type TerminalContext = {
  isFunMode: boolean
  cvHref: string | null
  pickJoke: () => string
}

const none: TerminalAction = { type: TerminalActionType.none }

// xkcd 149 — the bare request is the setup, sudo is the punchline.
const SANDWICH_REQUEST = /^make[- ]me[- ]a[- ]sandwich$/

const hasFlag = (args: string[], letter: string): boolean =>
  args.some((arg) => /^-[a-zA-Z]+$/.test(arg) && arg.includes(letter))

const HIDDEN_FILE = '.the-game'

// The classic hidden-folder gag — catting it opens the official upload in a new tab.
const RICKROLL_FILE = '.homework'
const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

// Writable via `echo <text> > .eyebrow` — queues the hero's next typed eyebrow line.
const EYEBROW_FILE = '.eyebrow'

const hiddenFiles = [EYEBROW_FILE, RICKROLL_FILE, HIDDEN_FILE]

// `rm -rf /` lands on the 404 page — any unknown path hits the catch-all route.
const RM_CRASH_PATH = '/everything-is-gone'

const HELP_LINES = [
  'help          this list',
  'ls [page]     list pages here',
  'tree          the full page tree',
  'cd <page>     go to a page (Tab completes)',
  'cat <page>    a page in one line',
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

// `scope` narrows the tree to a subtree (`ls -R <page>` / `tree <page>`); omit for the full tree.
function treePages(showHidden: boolean, scope?: { pathArg: string; cmd: string }): string[] {
  let pages = terminalPages
  let rootLabel = '.'
  if (scope) {
    const segments = toSegments(scope.pathArg)
    const node = segments && segments.length > 0 ? findPage(segments) : null
    if (segments && segments.length === 0) {
      // Explicit root ('/', '~') — keep the full tree.
    } else if (!node) {
      return [`${scope.cmd}: ${scope.pathArg}: no such page`]
    } else {
      pages = node.children
      rootLabel = node.children.length > 0 ? `${node.name}/` : node.name
    }
  }
  const roots = showHidden
    ? [...hiddenFiles.map((name) => ({ name, path: '', children: [] })), ...pages]
    : pages
  const lines = [rootLabel]
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
  if (fileArg === EYEBROW_FILE) {
    return {
      output: [`the header's next line. write it: echo <text> > ${EYEBROW_FILE}`],
      action: none,
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

  if (SANDWICH_REQUEST.test(tokens.join(' '))) {
    return { output: ['What? Make it yourself.'], action: none }
  }

  switch (command) {
    case TerminalCommand.help:
      return { output: HELP_LINES, action: none }
    case TerminalCommand.ls: {
      const pathArg = args.find((arg) => !arg.startsWith('-'))
      // -R is ls's spelling of the tree view.
      return {
        output: hasFlag(args, 'R')
          ? treePages(hasFlag(args, 'a'), pathArg ? { pathArg, cmd: 'ls' } : undefined)
          : listPages(pathArg, hasFlag(args, 'a')),
        action: none,
      }
    }
    case TerminalCommand.tree: {
      const pathArg = args.find((arg) => !arg.startsWith('-'))
      return {
        output: treePages(hasFlag(args, 'a'), pathArg ? { pathArg, cmd: 'tree' } : undefined),
        action: none,
      }
    }
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
        output: [
          ctx.isFunMode
            ? 'Brent Butkow - full-snack engineer'
            : 'Brent Butkow - full-stack engineer',
        ],
        action: none,
      }
    case TerminalCommand.sudo:
      return {
        output: [
          SANDWICH_REQUEST.test(args.join(' '))
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
    case TerminalCommand.echo: {
      const redirect = args.findIndex((arg) => arg.startsWith('>'))
      if (redirect === -1) return { output: [args.join(' ')], action: none }
      const target = args[redirect] === '>' ? args[redirect + 1] : args[redirect].slice(1)
      const text = args.slice(0, redirect).join(' ')
      if (!target) return { output: ['echo: missing redirect target'], action: none }
      if (target !== EYEBROW_FILE) {
        return {
          output: [`echo: cannot write to '${target}': this site is read-only`],
          action: none,
        }
      }
      if (!text) return { output: ['echo: nothing to write'], action: none }
      return { output: [], action: { type: TerminalActionType.setEyebrow, text } }
    }
    case TerminalCommand.sl:
      // The classic ls typo — a steam locomotive chugs across the log.
      return { output: [], action: { type: TerminalActionType.animate, text: STEAM_LOCOMOTIVE } }
    case TerminalCommand.cowsay:
      return { output: cowsay(args.join(' ')).split('\n'), action: none, art: true }
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
  TerminalCommand.tree,
  TerminalCommand.cat,
]

// ls/tree take a directory to descend into, so only pages with children are worth completing —
// a leaf page still runs (`ls achievements`), it just isn't suggested.
const dirOnlyCommands: string[] = [TerminalCommand.ls, TerminalCommand.tree]

// Files cat can read at the root, offered alongside pages. Dotfiles stay out of suggestions
// until the typed partial starts with '.' — same convention as a real shell.
const catFiles = ['cv.pdf', ...hiddenFiles]

// `echo <text> > ` completes its one writable target — the `.eyebrow` queue. The redirect
// itself is the signal of intent, so the dotfile is offered even before a '.' is typed.
function echoRedirectCompletion(input: string): string[] {
  const gt = input.indexOf('>')
  if (gt === -1) return []
  const afterGt = input.slice(gt + 1)
  const typed = afterGt.replace(/^\s*/, '')
  if (typed.includes(' ') || !EYEBROW_FILE.startsWith(typed) || typed === EYEBROW_FILE) return []
  // Insert a space when nothing yet follows the '>', so it reads `> .eyebrow`, not `>.eyebrow`.
  const separator = afterGt === '' ? ' ' : ''
  return [input + separator + EYEBROW_FILE.slice(typed.length)]
}

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
  if (command === TerminalCommand.echo) return echoRedirectCompletion(input)

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

  const dirsOnly = dirOnlyCommands.includes(command)
  const pageMatches = level
    .filter((page) => page.name.startsWith(partial) && page.name !== partial)
    .filter((page) => !dirsOnly || page.children.length > 0)
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
