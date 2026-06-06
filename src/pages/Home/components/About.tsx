import styles from './About.module.scss'

type AboutProps = {
  paragraphs: string[]
}

function About({ paragraphs }: AboutProps) {
  return (
    <section className={styles.about} aria-label="About Brent Butkow">
      <p className={styles.eyebrow}>About</p>
      <div className={styles.body}>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}

export default About
