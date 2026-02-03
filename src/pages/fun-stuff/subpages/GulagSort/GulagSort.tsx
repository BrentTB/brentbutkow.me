import PageLayout from '../../../../components/PageFormatting/PageLayout'
import PageHeader from '../../../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../../../components/utils/SafeLink'
import GulagSortVisualizer from './GulagSortVisualizer'
import styles from './GulagSort.module.scss'

function GulagSort() {
  return (
    <PageLayout>
      <PageHeader title="Gulag Sort" />
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
          correct order are "removed" (i.e., sent to a Gulag) until the remaining elements are all
          sorted.
        </p>
        <p>
          Gulag Sort is an algorithm based on this concept, in which the elements in the gulag are
          stored. The stored elements then go through the same sorting process, creating a second
          gulag. This continues until all gulags only contain sorted elements, at which point the
          gulags are merged back together to form a fully sorted array.
        </p>
      </div>
      <GulagSortVisualizer />
    </PageLayout>
  )
}

export default GulagSort
