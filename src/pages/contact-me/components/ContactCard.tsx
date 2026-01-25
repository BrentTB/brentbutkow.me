import { ContactPlatform } from '../../../data/data.types'
import { SafeLink } from '../../../components/utils/SafeLink'
import styles from './ContactCard.module.scss'

type ContactCardProps = {
  contactPlatform: ContactPlatform
  index: number
}

function ContactCard({ contactPlatform, index }: ContactCardProps) {
  return (
    <div className={styles.card}>
      <div>
        <p className={styles.eyebrow}>Contact</p>
        <p className={styles.copy}>Find me on {contactPlatform.platform}:</p>
        <div className={styles.contact}>
          <SafeLink href={contactPlatform.url}>
            <span
              className={styles.logoWrapper}
              style={{ '--offset': `-${index / 2}s` } as React.CSSProperties}
            >
              <img
                src={contactPlatform.logoPath}
                alt={`${contactPlatform.platform} logo`}
                className={styles.logo}
              />
            </span>
            <span className={styles.inbetween}> - </span>
            <span className={styles.cta}>{contactPlatform.shownName}</span>
          </SafeLink>
        </div>
      </div>
    </div>
  )
}

export default ContactCard
