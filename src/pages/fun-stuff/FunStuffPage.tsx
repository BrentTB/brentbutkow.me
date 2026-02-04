// import FunCard from './components/FunCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import FunCard from './components/FunCard'
import { funStuff } from './data'

function FunStuffPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Fun Stuff"
        subtitle="Projects and fun things that I have worked on outside of work."
      />
      {funStuff.map((item) => (
        <FunCard key={`${item.title}-${item.link ?? ''}`} item={item} />
      ))}
      <h3>More Coming soon!</h3>
    </PageLayout>
  )
}

export default FunStuffPage
