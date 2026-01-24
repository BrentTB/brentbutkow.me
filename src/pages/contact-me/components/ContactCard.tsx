import { ContactPlatform } from '../../../data/data.types'
import { SafeLink } from '../../../components/SafeLink'
import styles from './ContactCard.module.scss'

type ContactCardProps = {
  contactPlatform: ContactPlatform
}

function ContactCard({ contactPlatform }: ContactCardProps) {
  return (
    <div className={styles.card}>
      <div>
        <p className={styles.eyebrow}>Contact</p>
        <p className={styles.copy}>Find me on {contactPlatform.platform}:</p>
        <div className={styles.contact}>
          <img
            src={contactPlatform.logoPath}
            alt={`${contactPlatform.platform} logo`}
            className={styles.logo}
          />
          <p className={styles.inbetween}> - </p>
          <SafeLink className={styles.cta} href={contactPlatform.url}>
            {contactPlatform.shownName}
          </SafeLink>
        </div>
      </div>
    </div>
  )
}

export default ContactCard
