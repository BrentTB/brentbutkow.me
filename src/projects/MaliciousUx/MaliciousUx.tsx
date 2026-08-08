import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { useFunMode } from '../../contexts/useFunMode'
import { Exhibit } from './components/Exhibit/Exhibit'
import { pageCopy, wingCopy } from './data'
import { exhibits, exhibitsInWing } from './exhibits/registry'
import { Wing } from './malicious-ux.types'
import styles from './MaliciousUx.module.scss'

// The one place wing order is written down; the floor plan and the sections both walk this.
const wings = Object.values(Wing)

const wingAnchor = (wing: Wing) => `wing-${wing}`

export function MaliciousUx() {
  const { isFunMode } = useFunMode()

  return (
    <PageLayout>
      <PageHeader title={pageCopy.title}>
        {isFunMode ? pageCopy.taglineFun : pageCopy.tagline}
      </PageHeader>

      <p className={styles.admission}>{pageCopy.admission(exhibits.length)}</p>

      <nav className={styles.plan} aria-labelledby="malicious-ux-plan-title">
        <p className={styles.planTitle} id="malicious-ux-plan-title">
          {pageCopy.planTitle}
        </p>
        <ol className={styles.planList}>
          {wings.map((wing) => {
            const count = exhibitsInWing(wing).length
            return (
              <li key={wing}>
                <a
                  className={styles.planLink}
                  href={`#${wingAnchor(wing)}`}
                  aria-label={`${wingCopy[wing].number}: ${wingCopy[wing].title}, ${count} specimens`}
                >
                  <span className={styles.planNumber}>{wingCopy[wing].number}</span>
                  {wingCopy[wing].title}
                  <span className={styles.planCount}>{count}</span>
                </a>
              </li>
            )
          })}
        </ol>
      </nav>

      <aside className={styles.promise}>
        <h2 className={styles.promiseTitle}>{pageCopy.promiseTitle}</h2>
        <p className={styles.promiseBody}>{pageCopy.promise}</p>
      </aside>

      {wings.map((wing) => (
        <section className={styles.wing} key={wing} aria-labelledby={wingAnchor(wing)}>
          <header className={styles.wingHead}>
            <p className={styles.wingNumber}>{wingCopy[wing].number}</p>
            <h2 className={styles.wingTitle} id={wingAnchor(wing)}>
              {wingCopy[wing].title}
            </h2>
            <p className={styles.wingBlurb}>{wingCopy[wing].blurb}</p>
          </header>

          {exhibitsInWing(wing).map(({ id, accession, copy, component: Specimen }) => (
            <Exhibit accession={accession} copy={copy} key={id}>
              <Specimen />
            </Exhibit>
          ))}
        </section>
      ))}

      <section className={styles.closing}>
        <h2 className={styles.closingTitle}>{pageCopy.closingTitle}</h2>
        <p className={styles.closingBody}>{pageCopy.closing}</p>
      </section>
    </PageLayout>
  )
}
