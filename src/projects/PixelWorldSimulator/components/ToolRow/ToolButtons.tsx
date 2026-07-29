import { Tool } from '../../pixel-world.types'
import { TOOLS, simCopy } from '../../data'
import styles from './ToolRow.module.scss'

type ToolButtonsProps = {
  selected: Tool
  onSelect(tool: Tool): void
}

/**
 * The forces, laid out rather than folded into a dropdown: three of them is no wall, and seeing the whole
 * set is how you find out the sim has forces in it at all.
 *
 * Its own component because it is placed in two places. Beside the world it sits in the tool column under the
 * view buttons; on a phone the page puts it on the same line as the material chip, since choosing a tool and
 * choosing a material are the same move there.
 */
export function ToolButtons({ selected, onSelect }: ToolButtonsProps) {
  return (
    <div className={styles.tools} role="group" aria-label={simCopy.tools.label}>
      {TOOLS.map(({ tool, label, title }) => (
        <button
          key={tool}
          type="button"
          className={styles.tool}
          title={title}
          aria-pressed={tool === selected}
          // Pressing the force in hand puts it down, which is the way back to laying material from inside the
          // row. There is no Paint button standing in for "none": picking a material does that.
          onClick={() => onSelect(tool === selected ? Tool.paint : tool)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
