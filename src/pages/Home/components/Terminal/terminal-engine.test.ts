import { describe, it, expect } from 'vitest'
import { completions, execute, TerminalActionType, TerminalContext } from './terminal-engine'
import { routePaths } from '../../../../routes/routes.paths'
import { routesMeta } from '../../../../routes/routes.meta'

const ctx: TerminalContext = {
  isFunMode: false,
  cvHref: null,
  pickJoke: () => 'a joke',
}

const funCtx: TerminalContext = { ...ctx, isFunMode: true }

describe('execute — navigation commands', () => {
  it('cd navigates to a top-level page', () => {
    const result = execute('cd experience', ctx)
    expect(result.action).toEqual({
      type: TerminalActionType.navigate,
      path: routePaths.experience,
    })
    expect(result.output).toEqual([])
  })

  it('cd resolves nested and absolute paths', () => {
    expect(execute('cd fun-stuff/games/null-space', ctx).action.path).toBe(
      '/fun-stuff/games/null-space'
    )
    expect(execute('cd /projects/recall-radar', ctx).action.path).toBe(routePaths.recallRadar)
    expect(execute('cd ~/contact', ctx).action.path).toBe(routePaths.contact)
  })

  it('cd handles .. inside a path', () => {
    expect(execute('cd fun-stuff/../projects', ctx).action.path).toBe(routePaths.projects)
  })

  it('cd above the root stays put', () => {
    expect(execute('cd ..', ctx).output[0]).toMatch(/top level/)
  })

  it('cd with no argument or ~ reports already home', () => {
    expect(execute('cd', ctx).output[0]).toMatch(/already home/)
    expect(execute('cd ~', ctx).output[0]).toMatch(/already home/)
  })

  it('cd - goes back', () => {
    expect(execute('cd -', ctx).action.type).toBe(TerminalActionType.back)
  })

  it('cd rejects unknown pages', () => {
    const result = execute('cd narnia', ctx)
    expect(result.action.type).toBe(TerminalActionType.none)
    expect(result.output[0]).toMatch(/no such page/)
  })

  it('open and goto alias cd', () => {
    expect(execute('open contact', ctx).action.path).toBe(routePaths.contact)
    expect(execute('goto education', ctx).action.path).toBe(routePaths.education)
  })
})

describe('execute — ls', () => {
  it('lists top-level pages with a slash on pages that have children', () => {
    const listing = execute('ls', ctx).output[0]
    expect(listing).toContain('experience')
    expect(listing).toContain('projects/')
    expect(listing).toContain('fun-stuff/')
    expect(listing).not.toContain('.the-game')
  })

  it('lists a nested level by path', () => {
    expect(execute('ls fun-stuff/games', ctx).output[0]).toBe('null-space')
  })

  it('rejects unknown paths', () => {
    expect(execute('ls narnia', ctx).output[0]).toMatch(/no such page/)
  })

  it('-a reveals the hidden game file, which cat pays off', () => {
    expect(execute('ls -a', ctx).output[0]).toContain('.the-game')
    expect(execute('cat .the-game', ctx).output[0]).toBe('You just lost the game.')
  })
})

describe('execute — tree', () => {
  it('draws the full nested structure with branch glyphs', () => {
    const output = execute('tree', ctx).output
    expect(output[0]).toBe('.')
    expect(output).toContain('├── projects/')
    expect(output).toContain('│   └── recall-radar')
    expect(output).toContain('│   └── games/')
    expect(output).toContain('│       └── null-space')
    expect(output).toContain('└── contact')
  })

  it('covers every page exactly once', () => {
    const output = execute('tree', ctx).output.join('\n')
    for (const name of ['experience', 'education', 'achievements', 'ascii-art', 'gulag-sort']) {
      expect(output).toContain(name)
    }
  })

  it('-a adds the hidden game file; ls -R is an alias', () => {
    expect(execute('tree', ctx).output.join('\n')).not.toContain('.the-game')
    expect(execute('tree -a', ctx).output.join('\n')).toContain('.the-game')
    expect(execute('ls -R', ctx).output).toEqual(execute('tree', ctx).output)
    expect(execute('ls -aR', ctx).output).toEqual(execute('tree -a', ctx).output)
  })

  it('is Tab-completable and listed in help', () => {
    expect(completions('tr')).toEqual(['tree '])
    expect(execute('help', ctx).output.join('\n')).toContain('tree')
  })

  it('scopes to a subtree when given a page arg', () => {
    const output = execute('ls -R projects', ctx).output
    expect(output[0]).toBe('projects/')
    expect(output.join('\n')).toContain('recall-radar')
    expect(output.join('\n')).not.toContain('contact')
  })

  it('reports a missing page for a bad subtree arg', () => {
    expect(execute('ls -R narnia', ctx).output[0]).toMatch(/no such page/)
  })
})

describe('execute — easter eggs and misc', () => {
  it('help lists the public commands', () => {
    const output = execute('help', ctx).output.join('\n')
    for (const command of ['help', 'ls', 'cd', 'cat', 'joke', 'clear', 'exit']) {
      expect(output).toContain(command)
    }
  })

  it('pwd still works but is kept out of help and Tab completion', () => {
    expect(execute('pwd', ctx).output[0]).toBe('~ - the home page')
    expect(execute('help', ctx).output.join('\n')).not.toContain('pwd')
    expect(completions('pw')).toEqual([])
  })

  it('whoami answer depends on the mode', () => {
    expect(execute('whoami', ctx).output[0]).toBe('Brent Butkow - full-stack engineer')
    expect(execute('whoami', funCtx).output[0]).toBe('Brent Butkow - full-snack engineer')
  })

  it('sudo make-me-a-sandwich complies; anything else gets reported', () => {
    expect(execute('sudo make-me-a-sandwich', ctx).output[0]).toBe('Okay.')
    expect(execute('sudo make me a sandwich', ctx).output[0]).toBe('Okay.')
    expect(execute('sudo reboot', ctx).output[0]).toMatch(/not in the sudoers file/)
  })

  it('make-me-a-sandwich without sudo gets the xkcd setup line', () => {
    expect(execute('make-me-a-sandwich', ctx).output[0]).toBe('What? Make it yourself.')
    expect(execute('make me a sandwich', ctx).output[0]).toBe('What? Make it yourself.')
    expect(execute('make me a coffee', ctx).output[0]).toMatch(/command not found/)
  })

  it('fun toggles the mode with a message for the new state', () => {
    const turningOn = execute('fun', ctx)
    expect(turningOn.action.type).toBe(TerminalActionType.toggleFun)
    expect(turningOn.output[0]).toMatch(/on/i)
    expect(execute('fun', funCtx).output[0]).toBe('Back to business.')
  })

  it('cat on a page prints its route description', () => {
    expect(execute('cat education', ctx).output[0]).toBe(
      routesMeta[routePaths.education].description
    )
    expect(execute('cat fun-stuff/games/null-space', ctx).output[0]).toContain('space-defense')
    expect(execute('cat projects', ctx).output[0]).toContain('Recall Radar')
  })

  it('cat on the hidden homework file opens the video externally', () => {
    const result = execute('cat .homework', ctx)
    expect(result.action.type).toBe(TerminalActionType.openExternal)
    expect(result.action.path).toContain('youtube.com')
    expect(execute('ls -a', ctx).output[0]).toContain('.homework')
    expect(execute('tree -a', ctx).output.join('\n')).toContain('.homework')
  })

  it('cat cv.pdf downloads when published, jokes when not', () => {
    expect(execute('cat cv.pdf', ctx).output[0]).toMatch(/yet/)
    expect(execute('cat cv.pdf', ctx).action.type).toBe(TerminalActionType.none)
    const published = execute('cat cv.pdf', { ...ctx, cvHref: '/cv.pdf' })
    expect(published.action.type).toBe(TerminalActionType.downloadCv)
  })

  it('rm -rf / navigates to a page that no longer exists', () => {
    const result = execute('rm -rf /', ctx)
    expect(result.action.type).toBe(TerminalActionType.navigate)
    expect(result.output.length).toBeGreaterThan(0)
  })

  it('every delete-everything spelling gets the same payoff', () => {
    for (const raw of ['rm -rf ./*', 'rm -rf .', 'rm -rf *', 'rm -rf ~', 'rm -rf /*', 'rm -r ~/']) {
      expect(execute(raw, ctx).action.type, raw).toBe(TerminalActionType.navigate)
    }
  })

  it('rm without the recursive flag is refused even on /', () => {
    expect(execute('rm /', ctx).output[0]).toMatch(/read-only/)
    expect(execute('rm -f .', ctx).output[0]).toMatch(/read-only/)
  })

  it('rm on anything else is refused', () => {
    expect(execute('rm homework', ctx).output[0]).toMatch(/read-only/)
    expect(execute('rm -rf homework', ctx).output[0]).toMatch(/read-only/)
  })

  it('joke defers to the provided picker', () => {
    expect(execute('joke', ctx).output[0]).toBe('a joke')
  })

  it('echo echoes, clear clears, exit exits', () => {
    expect(execute('echo hello there', ctx).output[0]).toBe('hello there')
    expect(execute('clear', ctx).action.type).toBe(TerminalActionType.clear)
    expect(execute('exit', ctx).action.type).toBe(TerminalActionType.exit)
  })

  it('unknown commands point at help', () => {
    expect(execute('dance', ctx).output[0]).toBe("command not found: dance (try 'help')")
  })

  it('echo redirected to .eyebrow queues the text, silently like a real shell', () => {
    const result = execute('echo snack time > .eyebrow', ctx)
    expect(result.action).toEqual({ type: TerminalActionType.setEyebrow, text: 'snack time' })
    expect(result.output).toEqual([])
    expect(execute('echo hi >.eyebrow', ctx).action.type).toBe(TerminalActionType.setEyebrow)
  })

  it('echo redirection is refused everywhere else', () => {
    expect(execute('echo hi > /etc/passwd', ctx).output[0]).toMatch(/read-only/)
    expect(execute('echo hi >', ctx).output[0]).toMatch(/missing redirect target/)
    expect(execute('echo > .eyebrow', ctx).output[0]).toMatch(/nothing to write/)
  })

  it('cat .eyebrow explains the write', () => {
    expect(execute('cat .eyebrow', ctx).output[0]).toContain('echo <text> > .eyebrow')
    expect(execute('ls -a', ctx).output[0]).toContain('.eyebrow')
  })

  it('cowsay returns the bubble and cow as art', () => {
    const result = execute('cowsay moo', ctx)
    expect(result.art).toBe(true)
    expect(result.output.join('\n')).toContain('< moo >')
    expect(result.output.join('\n')).toContain('^__^')
  })

  it('cowsay with no message defaults to moo', () => {
    expect(execute('cowsay', ctx).output.join('\n')).toContain('< moo >')
  })

  it('sl triggers the train animation carrying the sprite', () => {
    const result = execute('sl', ctx)
    expect(result.action.type).toBe(TerminalActionType.animate)
    expect(result.action.text).toContain('====')
  })

  it('fullscreen toggles the mode; cmatrix and matrix start the rain', () => {
    expect(execute('fullscreen', ctx).action.type).toBe(TerminalActionType.toggleFullscreen)
    expect(execute('cmatrix', ctx).action.type).toBe(TerminalActionType.matrix)
    expect(execute('matrix', ctx).action.type).toBe(TerminalActionType.matrix)
  })

  it("typing the placeholder try 'help' literally gets called out", () => {
    expect(execute("try 'help'", ctx).output[0]).toBe('real funny.')
    expect(execute('try help', ctx).output[0]).toBe('real funny.')
    expect(execute('try harder', ctx).output[0]).toBe("command not found: try (try 'help')")
  })
})

describe('completions', () => {
  it('completes command names with a trailing space', () => {
    expect(completions('he')).toEqual(['help '])
  })

  it('does not advertise easter-egg commands', () => {
    expect(completions('sud')).toEqual([])
    expect(completions('who')).toEqual([])
  })

  it('completes top-level page names, marking parents with a slash', () => {
    expect(completions('cd exp')).toEqual(['cd experience'])
    expect(completions('cd pro')).toEqual(['cd projects/'])
  })

  it('completes nested paths so repeated Tab digs deeper', () => {
    expect(completions('cd fun-stuff/ga')).toEqual(['cd fun-stuff/games/'])
    expect(completions('cd fun-stuff/games/')).toEqual(['cd fun-stuff/games/null-space'])
  })

  it('returns every match sorted for ambiguous prefixes', () => {
    expect(completions('cd e')).toEqual(['cd education', 'cd experience'])
  })

  it('offers nothing for unknown parents, empty input, or flags', () => {
    expect(completions('cd narnia/x')).toEqual([])
    expect(completions('')).toEqual([])
    expect(completions('ls -')).toEqual([])
  })

  // Guards the '.' partial — it used to vanish during path resolution, so 'cd .' matched every
  // page and Tab produced broken paths like 'cd .achievements'.
  it('a bare dot never completes to a page for cd', () => {
    expect(completions('cd .')).toEqual([])
    expect(completions('cd fun-stuff/.')).toEqual([])
  })

  it('offers nothing once a path command already has an earlier argument', () => {
    expect(completions('cd test a')).toEqual([])
    expect(completions('cat foo bar')).toEqual([])
    // Flags before the path are fine — only earlier non-flag args disqualify it.
    expect(completions('ls -a fun')).toEqual(['ls -a fun-stuff/'])
  })

  it('ls and tree complete only directories, digging into nested ones', () => {
    expect(completions('ls pro')).toEqual(['ls projects/'])
    expect(completions('tree pro')).toEqual(['tree projects/'])
    expect(completions('tree fun-stuff/')).toEqual(['tree fun-stuff/games/'])
  })

  it('ls and tree skip leaf pages, which still run without a suggestion', () => {
    // 'achievements' is a leaf — allowed to list, but not offered as a completion.
    expect(completions('ls ach')).toEqual([])
    expect(completions('tree ach')).toEqual([])
    expect(completions('ls projects/')).toEqual([])
  })

  it('cat completes pages and digs into them like cd', () => {
    expect(completions('cat proj')).toEqual(['cat projects/'])
    expect(completions('cat projects/')).toEqual(['cat projects/recall-radar'])
  })

  it('cat completes its root files, hiding dotfiles until a dot is typed', () => {
    expect(completions('cat c')).toEqual(['cat contact', 'cat cv.pdf'])
    expect(completions('cat .')).toEqual(['cat .eyebrow', 'cat .homework', 'cat .the-game'])
    expect(completions('cat ')).not.toContain('cat .the-game')
  })

  it('cat itself Tab-completes as a command', () => {
    expect(completions('ca')).toEqual(['cat '])
  })

  it('echo completes .eyebrow once a redirect is typed, keeping the input a prefix', () => {
    expect(completions('echo cheese > .ey')).toEqual(['echo cheese > .eyebrow'])
    expect(completions('echo cheese > ')).toEqual(['echo cheese > .eyebrow'])
    // A bare '>' gains a space so it reads `> .eyebrow`, still a clean prefix of the input.
    expect(completions('echo cheese >')).toEqual(['echo cheese > .eyebrow'])
    // Only a self-attached partial stays attached — the sole way to keep the prefix intact.
    expect(completions('echo cheese >.ey')).toEqual(['echo cheese >.eyebrow'])
  })

  it('echo suggests nothing without a redirect, when done, or for a wrong target', () => {
    expect(completions('echo cheese')).toEqual([])
    expect(completions('echo cheese > .eyebrow')).toEqual([])
    expect(completions('echo cheese > wrong')).toEqual([])
  })
})
