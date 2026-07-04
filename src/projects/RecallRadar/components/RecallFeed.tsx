import { Link } from 'react-router-dom'
import {
  categoryLabels,
  entityTypeLabels,
  predictedClassLabel,
  predictedClassNote,
  severityColors,
  severityLabels,
  sourceLabels,
} from '../data'
import { formatDate } from '../chart-format'
import { recallDetailRoute } from '../api'
import { SafeLink } from '../../../components/utils/SafeLink'
import { getLinkArrow } from '../../../components/utils/link-arrow'
import { RelatedRecalls } from './RelatedRecalls'
import type { EventOut, Recall, TopicOut } from '../recall.types'
import styles from './RecallFeed.module.scss'

type RecallFeedProps = {
  recalls: Recall[]
  // Themes keyed by the recall's topicId, so the chip can show the label and filter by the slug.
  topicsById?: Map<number, TopicOut>
  onTopicSelect?: (slug: string) => void
  // The currently-active topic/event slugs, so a chip for the active filter clears it on re-click
  // (toggle), matching how the Themes / Outbreaks cards behave.
  activeTopic?: string
  // Event clusters keyed by the recall's eventClusterId — the badge shows only for outbreaks.
  eventsById?: Map<number, EventOut>
  onEventSelect?: (slug: string) => void
  activeEvent?: string
  // Expanded rows, keyed by recall number and owned by the parent (RecallRadar lifts them into the
  // URL so a refresh or shared link restores them).
  openRows: ReadonlySet<string>
  onRowToggle: (recallNumber: string, open: boolean) => void
}

type DetailRow = { term: string; value: string }

// Fields revealed on expand — everything not on the compact collapsed line.
function detailRows(recall: Recall): DetailRow[] {
  const rows: DetailRow[] = []
  if (recall.companyName) rows.push({ term: 'Company', value: recall.companyName })
  rows.push({
    term: 'Severity',
    value: `${severityLabels[recall.severityLabel]} (${recall.severityScore}/100)`,
  })
  rows.push({ term: 'Cause', value: categoryLabels[recall.category] })
  rows.push({ term: 'Confidence', value: `${Math.round(recall.categoryConfidence * 100)}%` })
  rows.push({ term: 'Source', value: sourceLabels[recall.source] })
  rows.push({ term: 'Recall number', value: recall.recallNumber })
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

export function RecallFeed({
  recalls,
  topicsById,
  onTopicSelect,
  activeTopic,
  eventsById,
  onEventSelect,
  activeEvent,
  openRows,
  onRowToggle,
}: RecallFeedProps) {
  if (recalls.length === 0) {
    return <p className={styles.empty}>No recalls match these filters.</p>
  }

  return (
    <ul className={styles.list}>
      {recalls.map((recall) => {
        const theme = recall.topicId != null ? topicsById?.get(recall.topicId) : undefined
        const cluster =
          recall.eventClusterId != null ? eventsById?.get(recall.eventClusterId) : undefined
        const predicted = predictedClassLabel(recall)
        const detailPath = recallDetailRoute(recall.source, recall.recallNumber)
        const isOpen = openRows.has(recall.recallNumber)
        return (
          // The id lets a URL-restored open row be scrolled to like a #fragment target.
          <li key={recall.recallNumber} id={`recall-${recall.recallNumber}`} className={styles.row}>
            <details
              className={styles.details}
              open={isOpen}
              // Read `open` synchronously: `currentTarget` is null once the event settles, which
              // crashes on rapid toggles. Reporting the DOM state (rather than negating ours) keeps
              // the two in sync even when React itself flips the attribute.
              onToggle={(event) => onRowToggle(recall.recallNumber, event.currentTarget.open)}
            >
              <summary className={styles.summary}>
                <div className={styles.head}>
                  <div className={styles.title}>
                    <span
                      className={styles.sevDot}
                      style={{ background: severityColors[recall.severityLabel] }}
                      title={`${severityLabels[recall.severityLabel]} · severity ${recall.severityScore}/100`}
                      aria-label={`Severity: ${severityLabels[recall.severityLabel]}`}
                    />
                    <Link
                      to={detailPath}
                      className={styles.product}
                      // Plain click toggles the row; the real href lets a modifier/right-click open
                      // the recall page in a new tab, and aria-expanded tells a screen reader the
                      // click toggles rather than navigates.
                      aria-expanded={isOpen}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                        event.preventDefault()
                        onRowToggle(recall.recallNumber, !isOpen)
                      }}
                    >
                      {recall.productDescription}
                    </Link>
                  </div>
                  {/* Theme + outbreak chips + date sit in one meta group that wraps below the title on
                      a narrow row, so the product name keeps the full width instead of being squeezed
                      to one word per line. Chips filter instead of toggling (preventDefault). */}
                  <div className={styles.meta}>
                    {theme && (
                      <button
                        type="button"
                        className={styles.themeChip}
                        onClick={(e) => {
                          e.preventDefault()
                          onTopicSelect?.(theme.slug === activeTopic ? '' : theme.slug)
                        }}
                        title={`Theme: ${theme.label} — filter by it`}
                      >
                        {theme.label}
                      </button>
                    )}
                    {cluster?.isOutbreak && (
                      <button
                        type="button"
                        className={styles.outbreakChip}
                        onClick={(e) => {
                          e.preventDefault()
                          onEventSelect?.(cluster.slug === activeEvent ? '' : cluster.slug)
                        }}
                        title="Part of an outbreak — filter to it"
                      >
                        ⚠ Outbreak
                      </button>
                    )}
                    {predicted && (
                      <span className={styles.predictedChip} title={predictedClassNote}>
                        {predicted}
                      </span>
                    )}
                    <span className={styles.date}>{formatDate(recall.reportDate)}</span>
                    <span className={styles.chevron} aria-hidden="true">
                      ›
                    </span>
                  </div>
                </div>
                <p className={styles.reason}>{recall.reasonText}</p>
              </summary>

              {recall.entities.length > 0 && (
                <div className={styles.tags}>
                  {recall.entities.map((entity) => (
                    <span
                      key={`${entity.type}-${entity.value}`}
                      className={styles.entityChip}
                      data-type={entity.type}
                      title={entityTypeLabels[entity.type]}
                    >
                      {entity.value}
                    </span>
                  ))}
                </div>
              )}
              <dl className={styles.detail}>
                {detailRows(recall).map((row) => (
                  <div key={row.term} className={styles.detailItem}>
                    <dt className={styles.detailTerm}>{row.term}</dt>
                    <dd className={styles.detailValue}>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.actions}>
                <p className={styles.detailPageLink}>
                  <Link to={detailPath}>Open recall page →</Link>
                </p>
                {recall.sourceUrl && (
                  <p className={styles.sourceLink}>
                    <SafeLink href={recall.sourceUrl}>
                      View original notice {getLinkArrow(false)}
                    </SafeLink>
                  </p>
                )}
              </div>
              {isOpen && (
                <RelatedRecalls source={recall.source} recallNumber={recall.recallNumber} />
              )}
            </details>
          </li>
        )
      })}
    </ul>
  )
}
