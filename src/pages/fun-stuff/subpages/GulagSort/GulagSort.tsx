import PageLayout from '../../../../components/PageFormatting/PageLayout'
import PageHeader from '../../../../components/PageFormatting/PageHeader'
import { SafeLink } from '../../../../components/utils/SafeLink'
import ToggleableSection from '../../../../components/ToggleableSection/ToggleableSection'
import CodeSection from '../../../../components/CodeSection/CodeSection'
import GulagSortVisualizer from './GulagSortVisualizer'
import styles from './GulagSort.module.scss'
import { gulagSortCode } from './data'

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
          Gulag Sort is an algorithm created based on this concept, in which the elements in the
          gulag are stored. The stored elements then go through the same sorting process, creating a
          second gulag. This continues until all gulags only contain sorted elements, at which point
          the gulags are merged back together to form a fully sorted array.
        </p>
        <p>
          I came up with this algorithm when learning about sorting algorithms for IOI. I do not
          suggest using this algorithm in production code, as there are strictly better
          alternatives, but it is fun for personal projects or personal learning.
        </p>
      </div>
      <GulagSortVisualizer />
      <ToggleableSection title="Technical Details">
        <h4>Time Complexity</h4>
        <p>
          <strong> - Best Case:</strong> O(n) – when the array is already sorted, no blocks are
          moved.
        </p>
        <p>
          <strong> - Amortised / Average Case:</strong> O(n log n) – balanced distribution of
          unsorted elements across gulags.
        </p>
        <p>
          <strong> - Worst Case:</strong> O(n²) – when the array is in reverse-sorted order, all
          elements are moved to their own gulag. This creates n gulags with 1 element each, leading
          to O(n) merges of O(n) elements.
        </p>
        <p>
          Note: This algorithm is objectively worse in performance than merge sort, but subjectively
          more fun.
        </p>
        <h4>Space Complexity</h4>
        <p>
          O(n) – space is needed to store every element, but in place merges can be done to reduce
          the space required. Note: the space complexity can change depending on implementation -
          eg: when created recursively, the space complexity will be higher.
        </p>
        <h4>Pseudocode/Steps</h4>
        <ol>
          <li>Separate the array into gulags by repeatedly extracting out-of-order elements</li>
          <li>Continue until all elements in the final gulag are sorted</li>
          <li>Merge gulags together from the bottom up</li>
        </ol>
      </ToggleableSection>
      <ToggleableSection title="Example Code">
        <CodeSection codeBlocks={gulagSortCode} />
      </ToggleableSection>
    </PageLayout>
  )
}

export default GulagSort
