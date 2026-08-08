import { ReactNode } from 'react'
import { ExhibitCopy } from '../../malicious-ux.types'
import styles from './Exhibit.module.scss'

interface ExhibitProps {
  /** Catalogue code, minted from the specimen's place in the registry. */
  accession: string
  copy: ExhibitCopy
  children: ReactNode
}

/** A wall label and the thing it describes: calm mono type on the rail, live hostile widget in the case. */
export function Exhibit({ accession, copy, children }: ExhibitProps) {
  const labelId = `${accession}-name`

  return (
    <article className={styles.exhibit} aria-labelledby={labelId}>
      <div className={styles.placard}>
        <p className={styles.accession}>{accession}</p>
        <h3 className={styles.name} id={labelId}>
          {copy.name}
        </h3>
        <p className={styles.crime}>{copy.crime}</p>
        <details className={styles.note}>
          <summary className={styles.summary}>Why it works</summary>
          <p className={styles.why}>{copy.why}</p>
          <p className={styles.seenAt}>
            <span className={styles.seenLabel}>Collected from</span> {copy.seenAt}
          </p>
        </details>
      </div>

      <div className={styles.case}>
        <div className={styles.glass}>{children}</div>
      </div>
    </article>
  )
}
