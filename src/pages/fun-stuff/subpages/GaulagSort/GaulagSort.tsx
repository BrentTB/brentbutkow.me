import PageLayout from '../../../../components/PageFormatting/PageLayout'
import PageHeader from '../../../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../../../components/utils/SafeLink'
import GaulagSortVisualizer from './GaulagSortVisualizer'
import styles from './GaulagSort.module.scss'

function GaulagSort() {
  return (
    <PageLayout>
      <PageHeader title="Gaulag Sort" />
      <div className={styles.intro}>
        <div className={styles.linkRow}>
          <span>Based on the joke</span>
          <SafeLink
            href="https://medium.com/@kaweendra/the-ultimate-sorting-algorithm-6513d6968420"
            className={styles.link}
          >
            Stalin sort.
          </SafeLink>
        </div>
        <p>
          Stalin sort is a sorting algorithm inspired by Joseph Stalin, in which elements not in the
          correct order are "removed" (i.e., sent to a Gaulag) until the remaining elements are all
          sorted.
        </p>
        <p>
          Gaulag Sort is an algorithm based on this concept, in which the elements in the gaulag are
          stored. The stored elements then go through the same sorting process, creating a second
          gaulag. This continues until all gaulags only contain sorted elements, at which point the
          gaulags are merged back together to form a fully sorted array.
        </p>
      </div>
      <GaulagSortVisualizer />
    </PageLayout>
  )
}

export default GaulagSort
