import { Tool } from '../../pixel-world.types'
import { TOOLS } from '../../data'
import styles from './ToolRow.module.scss'

type ToolRowProps = {
  selected: Tool
  onSelect(tool: Tool): void
}

/** What the pointer does to the world: paint a material, or push, pull and temper what is already there. */
export function ToolRow({ selected, onSelect }: ToolRowProps) {
  return (
    <div className={styles.tools} role="group" aria-label="Tool">
      {TOOLS.map(({ tool, label, title }) => (
        <button
          key={tool}
          type="button"
          className={styles.tool}
          title={title}
          aria-pressed={tool === selected}
          onClick={() => onSelect(tool)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
