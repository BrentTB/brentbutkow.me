import { FunItem } from '../../../data/data.types'
import styles from './FunCard.module.css'

type FunCardProps = {
  item: FunItem
}

function FunCard({ item }: FunCardProps) {
  const content = (
    <>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.description}>{item.description}</p>
      {item.link && <span className={styles.linkIcon}>↗</span>}
    </>
  )

  if (item.link) {
    return (
      <a href={item.link} className={styles.card} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return <article className={styles.card}>{content}</article>
}

export default FunCard
