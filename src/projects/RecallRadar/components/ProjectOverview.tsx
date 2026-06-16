import { methodologyPoints, recallRadarCopy, techStack } from '../data'
import styles from './ProjectOverview.module.scss'

export function ProjectOverview() {
  return (
    <section className={styles.overview}>
      <p className={styles.about}>{recallRadarCopy.about}</p>

      <div className={styles.block}>
        <h3 className={styles.area}>How it works</h3>
        <ul className={styles.points}>
          {methodologyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className={styles.block}>
        <h3 className={styles.area}>Built with</h3>
        <div className={styles.stack}>
          {techStack.map((group) => (
            <div key={group.area}>
              <h4 className={styles.subArea}>{group.area}</h4>
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
      </div>
    </section>
  )
}
