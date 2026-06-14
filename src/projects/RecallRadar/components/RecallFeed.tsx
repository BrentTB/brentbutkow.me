import { categoryLabels } from '../data'
import { formatDate } from '../chart-format'
import type { Recall } from '../recall.types'
import styles from './RecallFeed.module.scss'

type RecallFeedProps = {
  recalls: Recall[]
}

export function RecallFeed({ recalls }: RecallFeedProps) {
  if (recalls.length === 0) {
    return <p className={styles.empty}>No recalls match these filters.</p>
  }

  return (
    <ul className={styles.list}>
      {recalls.map((recall) => (
        <li key={recall.recallNumber} className={styles.row}>
          <div className={styles.meta}>
            <span className={styles.badge}>{categoryLabels[recall.category]}</span>
            <span className={styles.confidence} title="Classifier confidence">
              {Math.round(recall.categoryConfidence * 100)}%
            </span>
            {recall.classification && <span className={styles.class}>{recall.classification}</span>}
            <span className={styles.date}>{formatDate(recall.reportDate)}</span>
          </div>
          <p className={styles.product}>{recall.productDescription}</p>
          {recall.companyName && <p className={styles.company}>{recall.companyName}</p>}
          <p className={styles.reason}>{recall.reasonText}</p>
        </li>
      ))}
    </ul>
  )
}
