import { useState } from 'react'
import {
  categoryLabels,
  entityTypeLabels,
  severityColors,
  severityLabels,
  sourceLabels,
} from '../data'
import { formatDate } from '../chart-format'
import { SafeLink } from '../../../components/utils/SafeLink'
import { getLinkArrow } from '../../../components/utils/link-arrow'
import { RelatedRecalls } from './RelatedRecalls'
import type { Recall } from '../recall.types'
import styles from './RecallFeed.module.scss'

type RecallFeedProps = {
  recalls: Recall[]
  topicLabels?: Map<number, string>
  onTopicSelect?: (topicId: number) => void
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

export function RecallFeed({ recalls, topicLabels, onTopicSelect }: RecallFeedProps) {
  // Track which rows are open so the Related-recalls child mounts (and fetches) only on expand.
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())

  if (recalls.length === 0) {
    return <p className={styles.empty}>No recalls match these filters.</p>
  }

  return (
    <ul className={styles.list}>
      {recalls.map((recall) => {
        const themeLabel = recall.topicId != null ? topicLabels?.get(recall.topicId) : undefined
        return (
          <li key={recall.recallNumber} className={styles.row}>
            <details
              className={styles.details}
              onToggle={(event) =>
                setOpenRows((prev) => {
                  const next = new Set(prev)
                  if (event.currentTarget.open) next.add(recall.recallNumber)
                  else next.delete(recall.recallNumber)
                  return next
                })
              }
            >
              <summary className={styles.summary}>
                <div className={styles.meta}>
                  <span className={styles.badge}>{categoryLabels[recall.category]}</span>
                  <span
                    className={styles.severity}
                    style={{ color: severityColors[recall.severityLabel] }}
                    title={`Severity ${recall.severityScore}/100`}
                  >
                    {severityLabels[recall.severityLabel]}
                  </span>
                  {themeLabel && (
                    <button
                      type="button"
                      className={styles.themeChip}
                      // Inside <summary>, so stop the click from toggling the row.
                      onClick={(event) => {
                        event.preventDefault()
                        if (recall.topicId != null) onTopicSelect?.(recall.topicId)
                      }}
                      title="Filter by this theme"
                    >
                      {themeLabel}
                    </button>
                  )}
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
                {recall.entities.length > 0 && (
                  <ul className={styles.entities}>
                    {recall.entities.map((entity) => (
                      <li
                        key={`${entity.type}-${entity.value}`}
                        className={styles.entityChip}
                        data-type={entity.type}
                        title={entityTypeLabels[entity.type]}
                      >
                        {entity.value}
                      </li>
                    ))}
                  </ul>
                )}
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
              {openRows.has(recall.recallNumber) && (
                <RelatedRecalls source={recall.source} recallNumber={recall.recallNumber} />
              )}
            </details>
          </li>
        )
      })}
    </ul>
  )
}
