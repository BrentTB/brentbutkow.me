import { FunItem } from '../../../data/data.types'
import { SafeLink } from '../../../utils/SafeLink'
import styles from './FunCard.module.scss'

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
      <SafeLink href={item.link} className={styles.card}>
        {content}
      </SafeLink>
    )
  }

  return <article className={styles.card}>{content}</article>
}

export default FunCard
