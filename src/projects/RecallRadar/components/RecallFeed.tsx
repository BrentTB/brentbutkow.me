import { categoryLabels, sourceLabels } from '../data'
import { formatDate } from '../chart-format'
import { SafeLink } from '../../../components/utils/SafeLink'
import { getLinkArrow } from '../../../components/utils/link-arrow'
import type { Recall } from '../recall.types'
import styles from './RecallFeed.module.scss'

type RecallFeedProps = {
  recalls: Recall[]
}

type DetailRow = { term: string; value: string }

// Fields revealed on expand — everything not already in the collapsed summary.
function detailRows(recall: Recall): DetailRow[] {
  const rows: DetailRow[] = [{ term: 'Recall number', value: recall.recallNumber }]
  if (recall.status) rows.push({ term: 'Status', value: recall.status })
  if (recall.classification) rows.push({ term: 'Classification', value: recall.classification })
  if (recall.distributionPattern) {
    rows.push({ term: 'Distribution', value: recall.distributionPattern })
  }
  if (recall.recallInitiationDate) {
    rows.push({ term: 'Initiated', value: formatDate(recall.recallInitiationDate) })
  }
  return rows
}

export function RecallFeed({ recalls }: RecallFeedProps) {
  if (recalls.length === 0) {
    return <p className={styles.empty}>No recalls match these filters.</p>
  }

  return (
    <ul className={styles.list}>
      {recalls.map((recall) => (
        <li key={recall.recallNumber} className={styles.row}>
          <details className={styles.details}>
            <summary className={styles.summary}>
              <div className={styles.meta}>
                <span className={styles.badge}>{categoryLabels[recall.category]}</span>
                <span className={styles.source}>{sourceLabels[recall.source]}</span>
                <span className={styles.confidence} title="Classifier confidence">
                  {Math.round(recall.categoryConfidence * 100)}%
                </span>
                {recall.classification && (
                  <span className={styles.class}>{recall.classification}</span>
                )}
                <span className={styles.date}>{formatDate(recall.reportDate)}</span>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </div>
              <p className={styles.product}>{recall.productDescription}</p>
              {recall.companyName && <p className={styles.company}>{recall.companyName}</p>}
              <p className={styles.reason}>{recall.reasonText}</p>
            </summary>
            <dl className={styles.detail}>
              {detailRows(recall).map((row) => (
                <div key={row.term} className={styles.detailItem}>
                  <dt className={styles.detailTerm}>{row.term}</dt>
                  <dd className={styles.detailValue}>{row.value}</dd>
                </div>
              ))}
            </dl>
            {recall.sourceUrl && (
              <p className={styles.sourceLink}>
                <SafeLink href={recall.sourceUrl}>
                  View original notice {getLinkArrow(false)}
                </SafeLink>
              </p>
            )}
          </details>
        </li>
      ))}
    </ul>
  )
}
