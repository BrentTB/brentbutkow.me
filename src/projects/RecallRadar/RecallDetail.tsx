import { Link, useParams } from 'react-router-dom'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../components/utils/SafeLink'
import { getLinkArrow } from '../../components/utils/link-arrow'
import { recallRadarFilterRoute } from './api'
import { routePaths } from '../../routes/routes.paths'
import {
  categoryLabels,
  countryLabels,
  entityTypeLabels,
  predictedClassLabel,
  predictedClassNote,
  severityColors,
  severityLabels,
  sourceLabels,
} from './data'
import { formatDate } from './chart-format'
import { euGeographyRows } from './eu-geography'
import { RelatedRecalls } from './components/RelatedRecalls'
import { isRecallSource, type Recall, type RecallSource } from './recall.types'
import { useEvents } from './useEvents'
import { useRecallDetail } from './useRecallDetail'
import { useTopics } from './useTopics'
import styles from './RecallDetail.module.scss'

// Dedicated page for one recall (/recall-radar/:source/:recallNumber). Lets you land on, share, and
// drill into a recall — its theme and outbreak link back to the dashboard with that filter applied,
// and the related recalls link onward to their own pages.
export function RecallDetail() {
  const { source, recallNumber } = useParams<{ source: string; recallNumber: string }>()
  // Validate the untrusted URL params before fetching. Split into an inner view so the data hook is
  // always called (never behind this early return) — keeps hook order stable across renders.
  if (!source || !isRecallSource(source) || !recallNumber) {
    return (
      <PageLayout>
        <PageHeader title="Recall Radar" parentPath={routePaths.recallRadar} />
        <p className={styles.status}>That recall link looks malformed.</p>
      </PageLayout>
    )
  }
  return <RecallDetailView source={source} recallNumber={recallNumber} />
}

function RecallDetailView({
  source,
  recallNumber,
}: {
  source: RecallSource
  recallNumber: string
}) {
  const { data: recall, loading, error } = useRecallDetail(source, recallNumber)

  return (
    <PageLayout>
      <PageHeader title="Recall Radar" parentPath={routePaths.recallRadar} />
      {loading && <p className={styles.status}>Loading recall…</p>}
      {error && <p className={styles.status}>Couldn’t load this recall. It may not exist.</p>}
      {recall && <RecallDetailBody recall={recall} />}
    </PageLayout>
  )
}

// Rendered only once the recall has loaded, so the per-country theme/outbreak lookups always have a
// country to scope to.
function RecallDetailBody({ recall }: { recall: Recall }) {
  const topics = useTopics(recall.country)
  const events = useEvents(recall.country)
  const theme =
    recall.topicId != null ? topics.data?.find((t) => t.id === recall.topicId) : undefined
  const outbreak =
    recall.eventClusterId != null
      ? events.data?.find((e) => e.id === recall.eventClusterId)
      : undefined
  const predicted = predictedClassLabel(recall)

  return (
    <article className={styles.detail}>
      <div className={styles.metaRow}>
        <span className={styles.badge}>{categoryLabels[recall.category]}</span>
        <span
          className={styles.severity}
          style={{ color: severityColors[recall.severityLabel] }}
          title={`Severity ${recall.severityScore}/100`}
        >
          {severityLabels[recall.severityLabel]}
        </span>
        <span>{sourceLabels[recall.source]}</span>
        <span>{countryLabels[recall.country]}</span>
        {recall.classification && <span>{recall.classification}</span>}
        {predicted && (
          <span className={styles.predictedBadge} title={predictedClassNote}>
            {predicted}
          </span>
        )}
        <span>{formatDate(recall.reportDate)}</span>
      </div>

      <h1 className={styles.product}>{recall.productDescription}</h1>
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

      {(theme || outbreak) && (
        <div className={styles.partOf}>
          <span className={styles.partOfLabel}>Part of</span>
          {theme && (
            <Link
              className={styles.linkChip}
              to={recallRadarFilterRoute(recall.country, 'topic', theme.slug)}
            >
              Theme · {theme.label}
            </Link>
          )}
          {outbreak && (
            <Link
              className={`${styles.linkChip} ${outbreak.isOutbreak ? styles.outbreakChip : ''}`}
              to={recallRadarFilterRoute(recall.country, 'event', outbreak.slug)}
            >
              {outbreak.isOutbreak ? '⚠ Outbreak' : 'Event'} · {outbreak.label}
            </Link>
          )}
        </div>
      )}

      <dl className={styles.facts}>
        <Fact term="Recall number" value={recall.recallNumber} />
        {recall.status && <Fact term="Status" value={recall.status} />}
        {recall.state && <Fact term="State" value={recall.state} />}
        {/* EU/RASFF geography — empty on every other source. */}
        {euGeographyRows(recall).map((row) => (
          <Fact key={row.term} term={row.term} value={row.value} />
        ))}
        {recall.distributionPattern && (
          <Fact term="Distribution" value={recall.distributionPattern} />
        )}
        {recall.recallInitiationDate && (
          <Fact term="Initiated" value={formatDate(recall.recallInitiationDate)} />
        )}
        <Fact term="Reported" value={formatDate(recall.reportDate)} />
      </dl>

      {recall.sourceUrl && (
        <p className={styles.sourceLink}>
          <SafeLink href={recall.sourceUrl}>View original notice {getLinkArrow(false)}</SafeLink>
        </p>
      )}

      <RelatedRecalls source={recall.source} recallNumber={recall.recallNumber} />
    </article>
  )
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factTerm}>{term}</dt>
      <dd className={styles.factValue}>{value}</dd>
    </div>
  )
}
