import ContactCard from './components/ContactCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import { contactPlatforms } from './data'

function ContactMePage() {
  return (
    <PageLayout>
      <PageHeader
        title="Get in Touch"
        subtitle="If you want to see more about me, or just say hi, here are some ways to reach me."
      />
      {contactPlatforms.map((platform, index) => (
        <ContactCard key={platform.platform} contactPlatform={platform} index={index} />
      ))}
    </PageLayout>
  )
}

export default ContactMePage
