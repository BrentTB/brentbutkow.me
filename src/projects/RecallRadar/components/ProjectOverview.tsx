import { recallRadarCopy, techStack } from '../data'
import styles from './ProjectOverview.module.scss'

export function ProjectOverview() {
  return (
    <section className={styles.overview}>
      <p className={styles.about}>{recallRadarCopy.about}</p>
      <div className={styles.stack}>
        {techStack.map((group) => (
          <div key={group.area}>
            <h3 className={styles.area}>{group.area}</h3>
            <ul className={styles.pills}>
              {group.items.map((item) => (
                <li key={item} className={styles.pill}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
