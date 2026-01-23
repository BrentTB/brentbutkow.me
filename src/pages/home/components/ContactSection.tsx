import { ContactInfo } from '../../../data/data.types'
import styles from './ContactSection.module.css'

type ContactSectionProps = {
  info: ContactInfo
}

function ContactSection({ info }: ContactSectionProps) {
  return (
    <div className={styles.card}>
      <div>
        <p className={styles.eyebrow}>Contact</p>
        <h2 className={styles.title}>Let's collaborate</h2>
        <p className={styles.copy}>{info.availability}</p>
        <p className={styles.copy}>{info.location}</p>
      </div>
      <a className={styles.cta} href={`mailto:${info.email}`}>
        {info.email}
      </a>
    </div>
  )
}

export default ContactSection
