import { ContactPlatform } from '../../../data/data.types'
import styles from './ContactCard.module.scss'
import { ArticleOrLinkCard } from '../../../components/cards/ArticleOrLinkCard'

type ContactCardProps = {
  contactPlatform: ContactPlatform
}

function ContactCard({ contactPlatform }: ContactCardProps) {
  return (
    <ArticleOrLinkCard className={styles.card} href={contactPlatform.url}>
      <div className={styles.row}>
        <span className={styles.platform}>{contactPlatform.platform}</span>
        <span className={styles.value}>{contactPlatform.shownName}</span>
      </div>
    </ArticleOrLinkCard>
  )
}

export default ContactCard
