// import FunCard from './components/FunCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
import FunCard from './components/FunCard'
import { funStuff } from './data'
import styles from './FunStuffPage.module.scss'

function FunStuffPage() {
  return (
    <PageLayout>
      <PageHeader title="Fun Stuff" />
      <div className={styles.container}>
        {funStuff.map((item) => (
          <FunCard key={`${item.title}-${item.link ?? ''}`} item={item} />
        ))}
      </div>
    </PageLayout>
  )
}

export default FunStuffPage
