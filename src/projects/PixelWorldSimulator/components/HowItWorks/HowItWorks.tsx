import { ToggleableSection } from '../../../../components/ToggleableSection/ToggleableSection'
import { HOW_IT_WORKS, simCopy } from '../../data'
import { MaterialId } from '../../pixel-world.types'
import { MATERIALS } from '../../engine/materials'
import { materialCss } from '../../engine/palette'
import styles from './HowItWorks.module.scss'

/**
 * The density figure: the listed materials in the order they would settle, with the real numbers off the
 * material table. Sorted here rather than written in order, so a retuned density reorders the picture instead
 * of quietly making it a lie.
 */
function DensityLadder({ materials }: { materials: readonly MaterialId[] }) {
  const rungs = [...materials].sort((a, b) => MATERIALS[a].density - MATERIALS[b].density)
  const heaviest = MATERIALS[rungs[rungs.length - 1]].density

  return (
    <figure className={styles.ladder}>
      <figcaption className={styles.ladderCaption}>{simCopy.howItWorks.ladderCaption}</figcaption>
      <ol className={styles.rungs}>
        {rungs.map((material) => (
          <li key={material} className={styles.rung}>
            <span className={styles.swatch} style={{ background: materialCss(material) }} />
            <span className={styles.rungLabel}>{MATERIALS[material].label}</span>
            <span
              className={styles.bar}
              // Widths are relative to the heaviest rung, so the figure reads as an ordering rather than
              // implying the densities are a percentage of something.
              style={{ width: `${(MATERIALS[material].density / heaviest) * 100}%` }}
              aria-hidden="true"
            />
            <span className={styles.density}>{MATERIALS[material].density}</span>
          </li>
        ))}
      </ol>
    </figure>
  )
}

export function HowItWorks() {
  return (
    <div className={styles.howItWorks}>
      <ToggleableSection title={simCopy.howItWorks.title}>
        <div className={styles.body}>
          {HOW_IT_WORKS.map(({ heading, body, ladder }) => (
            <section key={heading} className={styles.section}>
              <h3 className={styles.heading}>{heading}</h3>
              {body.map((paragraph) => (
                <p key={paragraph} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
              {ladder !== undefined && <DensityLadder materials={ladder} />}
            </section>
          ))}
        </div>
      </ToggleableSection>
    </div>
  )
}
