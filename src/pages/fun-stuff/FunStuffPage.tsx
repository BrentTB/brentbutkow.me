import FunCard from './components/FunCard'
import PageLayout from '../../components/PageLayout'
import PageHeader from '../../components/PageHeader'
import styles from './FunStuffPage.module.css'
import { funStuff } from '../../data/data'

function FunStuffPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Fun Stuff"
        subtitle="Side projects, hobbies, and explorations outside of client work—where curiosity leads."
      />
      <div className={styles.grid}>
        {funStuff.map((item, index) => (
          <FunCard key={index} item={item} />
        ))}
      </div>
    </PageLayout>
  )
}

export default FunStuffPage
