import { SafeLink } from '../../../components/utils/SafeLink'
import { Eyebrow } from './Eyebrow'
import styles from './About.module.scss'

type AboutProps = {
  paragraphs: string[]
  /** CV download link; hidden while null (PDF not published yet). */
  cvHref: string | null
}

export function About({ paragraphs, cvHref }: AboutProps) {
  return (
    <section className={styles.about} aria-label="About Brent Butkow">
      <p className={styles.eyebrow}>
        <Eyebrow label="About" muted />
      </p>
      <div className={styles.body}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>
      {cvHref && (
        <SafeLink
          className={styles.cvLink}
          href={cvHref}
          internal={false}
          download="Brent Butkow - CV.pdf"
        >
          Download CV
        </SafeLink>
      )}
    </section>
  )
}
