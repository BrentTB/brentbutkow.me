import { formatDate } from '../chart-format'
import { severityColors, severityLabels, sourceLabels } from '../data'
import { useSimilar } from '../useSimilar'
import { SafeLink } from '../../../components/utils/SafeLink'
import { getLinkArrow } from '../../../components/utils/link-arrow'
import type { RecallSource } from '../recall.types'
import styles from './RelatedRecalls.module.scss'

type RelatedRecallsProps = {
  source: RecallSource
  recallNumber: string
}

// Rendered only while a feed row is open (see RecallFeed), so it fetches a recall's nearest
// neighbours on demand. The /similar payload already carries each neighbour's full record, so we
// surface its identifying fields (recall number, company, date, severity) inline — there's no way
// to open a neighbour on its own yet, so this is where its details are read.
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
              <p className={styles.product}>{recall.productDescription}</p>
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
              {recall.sourceUrl && (
                <SafeLink href={recall.sourceUrl}>View notice {getLinkArrow(false)}</SafeLink>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
