import ContactCard from './components/ContactCard'
import styles from './ContactMePage.module.css'
import { contactInfo } from '../../data/data'

function ContactMePage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Get in Touch</h1>
        <p className={styles.subtitle}>
          Open to collaborations, consulting engagements, and interesting conversations about
          building great software.
        </p>
      </div>
      <ContactCard info={contactInfo} />
    </main>
  )
}

export default ContactMePage
