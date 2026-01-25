import ContactCard from './components/ContactCard'
import PageLayout from '../../components/PageLayout'
import PageHeader from '../../components/PageHeader'
import { contactPlatforms } from './data'

function ContactMePage() {
  return (
    <PageLayout>
      <PageHeader
        title="Get in Touch"
        subtitle="Open to collaborations, consulting engagements, and interesting conversations about building great software."
      />
      {contactPlatforms.map((platform, index) => (
        <ContactCard key={platform.platform} contactPlatform={platform} index={index} />
      ))}
    </PageLayout>
  )
}

export default ContactMePage
