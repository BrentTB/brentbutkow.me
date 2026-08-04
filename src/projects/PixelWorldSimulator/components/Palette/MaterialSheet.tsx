import { MaterialId } from '../../pixel-world.types'
import { simCopy } from '../../data'
import { useDialogChrome } from '../../../../components/utils/useDialogChrome'
import { MaterialPicker } from './MaterialPicker'
import styles from './MaterialSheet.module.scss'

type MaterialSheetProps = {
  selected: MaterialId
  onSelect(material: MaterialId): void
  onClose(): void
}

/**
 * The picker as a sheet over the world, for phones. Choosing a material is a job you come to and leave,
 * so on a small screen it takes the whole screen for a moment rather than a third of it permanently — the
 * palette inline was the single biggest thing between the world and the controls.
 *
 * Picking closes it. That is the whole point of coming here, and a sheet that stays open just to be tidied
 * away is a second tap for nothing.
 */
export function MaterialSheet({ selected, onSelect, onClose }: MaterialSheetProps) {
  const { panelRef } = useDialogChrome(onClose)

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={simCopy.picker.title}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>{simCopy.picker.title}</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            {simCopy.picker.close}
          </button>
        </div>

        <div className={styles.body}>
          <MaterialPicker
            swatchClassName={styles.swatchRoom}
            selected={selected}
            onSelect={(material) => {
              onSelect(material)
              onClose()
            }}
          />
        </div>
      </div>
    </div>
  )
}
