import { useLocation } from 'react-router-dom'
import { useFunMode } from '../../contexts/useFunMode'
import { toTerminalPath } from '../../utils/terminal-path'
import styles from './CommandLine.module.scss'

interface CommandLineProps {
  /** The command shown after the prompt, e.g. `ls`. The current route is appended as its argument. */
  command?: string
}

// A fun-mode flourish above a list page: the `ls` that "produced" the rows below. Professional mode
// keeps the page clean, so this renders nothing there.
export function CommandLine({ command = 'ls' }: CommandLineProps) {
  const { isFunMode } = useFunMode()
  const location = useLocation()
  if (!isFunMode) return null

  return (
    <p className={styles.line} aria-hidden="true">
      <span className={styles.prompt}>$</span> {command} {toTerminalPath(location.pathname)}
    </p>
  )
}
