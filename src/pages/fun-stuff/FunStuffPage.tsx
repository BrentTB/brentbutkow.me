// import FunCard from './components/FunCard'
import PageLayout from '../../components/PageFormatting/PageLayout'
import PageHeader from '../../components/PageFormatting/PageHeader'
// import styles from './FunStuffPage.module.scss'
// import { funStuff } from './data'

function FunStuffPage() {
  return (
    <PageLayout>
      <PageHeader
        title="Fun Stuff"
        subtitle="Side projects, hobbies, and explorations outside of client work—where curiosity leads."
      />
      {/* <div className={styles.grid}>
        {funStuff.map((item) => (
          <FunCard key={item.title} item={item} />
        ))}
      </div> */}
      <h3>Coming soon!</h3>
    </PageLayout>
  )
}

export default FunStuffPage
