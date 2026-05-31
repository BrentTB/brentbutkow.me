import ContactCard from './components/ContactCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import { contactPlatforms } from './data'
import styles from './ContactMePage.module.scss'

function ContactMePage() {
  return (
    <PageLayout>
      <PageHeader title="Get in Touch" />
      <div className={styles.list}>
        {contactPlatforms.map((platform) => (
          <ContactCard key={platform.platform} contactPlatform={platform} />
        ))}
      </div>
    </PageLayout>
  )
}

export default ContactMePage
