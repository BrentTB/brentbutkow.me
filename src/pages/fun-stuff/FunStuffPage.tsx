import FunCard from './components/FunCard'
import styles from './FunStuffPage.module.css'
import { funStuff } from '../../data/data'

function FunStuffPage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fun Stuff</h1>
        <p className={styles.subtitle}>
          Side projects, hobbies, and explorations outside of client work—where curiosity leads.
        </p>
      </div>
      <div className={styles.grid}>
        {funStuff.map((item) => (
          <FunCard key={item.title} item={item} />
        ))}
      </div>
    </main>
  )
}

export default FunStuffPage
