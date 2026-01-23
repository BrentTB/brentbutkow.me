import ContactCard from './components/ContactCard'
import PageLayout from '../../components/PageLayout'
import PageHeader from '../../components/PageHeader'
import { contactInfo } from '../../data/data'

function ContactMePage() {
  return (
    <PageLayout>
      <PageHeader
        title="Get in Touch"
        subtitle="Open to collaborations, consulting engagements, and interesting conversations about building great software."
      />
      <ContactCard info={contactInfo} />
    </PageLayout>
  )
}

export default ContactMePage
