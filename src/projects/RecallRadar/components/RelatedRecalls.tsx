import { Link } from 'react-router-dom'
import { formatDate } from '../chart-format'
import { recallDetailRoute } from '../api'
import { severityColors, severityLabels, sourceLabels } from '../data'
import { useSimilar } from '../useSimilar'
import type { RecallSource } from '../recall.types'
import styles from './RelatedRecalls.module.scss'

type RelatedRecallsProps = {
  source: RecallSource
  recallNumber: string
}

// A recall's nearest neighbours by reason/product text, fetched on demand. Each neighbour shows its
// identifying fields (recall number, company, date, severity) and links to its own detail page —
// where the original notice lives. We deliberately don't repeat the "view notice" link per row here;
// it clutters the list, and the detail page is one click away.
export function RelatedRecalls({ source, recallNumber }: RelatedRecallsProps) {
  const { data, loading, error } = useSimilar(source, recallNumber)

  if (loading) return <p className={styles.status}>Finding related recalls…</p>
  if (error) return <p className={styles.status}>Couldn’t load related recalls.</p>
  if (!data || data.length === 0) {
    return <p className={styles.status}>No similar recalls found.</p>
  }

  return (
    <div className={styles.root}>
      <h4 className={styles.heading}>Related recalls</h4>
      <ul className={styles.list}>
        {data.map(({ similarity, recall }) => (
          <li key={`${recall.source}-${recall.recallNumber}`} className={styles.item}>
            <span className={styles.sim} title="Text similarity">
              {Math.round(similarity * 100)}%
            </span>
            <div className={styles.body}>
              <Link
                className={styles.product}
                to={recallDetailRoute(recall.source, recall.recallNumber)}
              >
                {recall.productDescription}
              </Link>
              <div className={styles.meta}>
                <span className={styles.recallNumber}>{recall.recallNumber}</span>
                <span
                  className={styles.severity}
                  style={{ color: severityColors[recall.severityLabel] }}
                  title={`Severity ${recall.severityScore}/100`}
                >
                  {severityLabels[recall.severityLabel]}
                </span>
                <span>{sourceLabels[recall.source]}</span>
                {recall.classification && <span>{recall.classification}</span>}
                <span>{formatDate(recall.reportDate)}</span>
              </div>
              {recall.companyName && <p className={styles.company}>{recall.companyName}</p>}
              <p className={styles.reason}>{recall.reasonText}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
