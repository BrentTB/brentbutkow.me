import ContactSection from '../home/components/ContactSection'
import styles from './ContactMe.module.css'
import { contactInfo } from '../../data/data'

function ContactMe() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Get in Touch</h1>
        <p className={styles.subtitle}>
          Open to collaborations, consulting engagements, and interesting conversations about
          building great software.
        </p>
      </div>
      <ContactSection info={contactInfo} />
    </main>
  )
}

export default ContactMe
