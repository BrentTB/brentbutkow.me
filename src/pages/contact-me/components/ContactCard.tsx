import { ContactPlatform } from '../../../data/data.types'
import styles from './ContactCard.module.scss'
import { ArticleOrLink } from '../../../components/utils/ArticleOrLink'

type ContactCardProps = {
  contactPlatform: ContactPlatform
  index: number
}

function ContactCard({ contactPlatform, index }: ContactCardProps) {
  return (
    <ArticleOrLink className={styles.card} href={contactPlatform.url}>
      <div>
        <p className={styles.eyebrow}>Find me on {contactPlatform.platform}:</p>
        <div className={styles.contact}>
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
        </div>
      </div>
    </ArticleOrLink>
  )
}

export default ContactCard
