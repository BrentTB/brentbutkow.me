import { ContactCard } from './components/ContactCard'
import { ContactForm } from './components/ContactForm'
import { PageLayout } from '../../components/PageFormatting/PageLayout'
import { PageHeader } from '../../components/PageFormatting/PageHeader'
import { contactPlatforms } from './data'
import styles from './ContactMePage.module.scss'

export function ContactMePage() {
  return (
    <PageLayout>
      <PageHeader title="Get in Touch" />
      <div className={styles.layout}>
        <ContactForm />
        <aside className={styles.aside}>
          <p className={styles.asideTitle}>Other ways to reach me</p>
          <div className={styles.list}>
            {contactPlatforms.map((platform) => (
              <ContactCard key={platform.platform} contactPlatform={platform} />
            ))}
          </div>
        </aside>
      </div>
    </PageLayout>
  )
}
