import { ArticleOrLinkCard } from './ArticleOrLinkCard'
import styles from './LabelledRow.module.scss'

type LabelledRowProps = {
  /** How the list classifies this row: `Tool`, `Board`, `Food safety`. Shown uppercased in the rail. */
  label: string
  title: string
  description: string
  href?: string
  internal?: boolean
  /** A count for a row that opens onto its own list, e.g. `4 games`. Renders the row emphasised. */
  hub?: string
}

export function LabelledRow({ label, title, description, href, internal, hub }: LabelledRowProps) {
  return (
    <ArticleOrLinkCard href={href} internal={internal}>
      <div className={hub ? `${styles.row} ${styles.hubRow}` : styles.row}>
        <span className={styles.label}>{label}</span>
        <div className={styles.body}>
          <h3 className={styles.title}>
            {title}
            {hub && <span className={styles.hubCount}>{hub}</span>}
          </h3>
          <p className={styles.description}>{description}</p>
        </div>
      </div>
    </ArticleOrLinkCard>
  )
}
