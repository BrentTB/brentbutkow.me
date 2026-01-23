import FunCard from './FunCard'
import styles from './FunStuff.module.css'
import { funStuff } from '../../data/data'

function FunStuff() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fun Stuff</h1>
        <p className={styles.subtitle}>
          Side projects, hobbies, and explorations outside of client work—where curiosity leads.
        </p>
      </div>
      <div className={styles.grid}>
        {funStuff.map((item, index) => (
          <FunCard key={index} item={item} />
        ))}
      </div>
    </main>
  )
}

export default FunStuff
