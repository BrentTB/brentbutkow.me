import { ContactInfo } from '../../../data/data.types'
import { SafeLink } from '../../../components/SafeLink'
import styles from './ContactCard.module.css'

type ContactCardProps = {
  info: ContactInfo
}

function ContactCard({ info }: ContactCardProps) {
  return (
    <div className={styles.card}>
      <div>
        <p className={styles.eyebrow}>Contact</p>
        <h2 className={styles.title}>Let's collaborate</h2>
        <p className={styles.copy}>{info.availability}</p>
        <p className={styles.copy}>{info.location}</p>
      </div>
      <SafeLink className={styles.cta} href={`mailto:${info.email}`}>
        {info.email}
      </SafeLink>
    </div>
  )
}

export default ContactCard
