import styles from './ImageDropper.module.scss'
import { useFileDrop } from '../../useFileDrop'

interface ImageDropperProps {
  label: string
  hint: string
  previewUrl: string | null
  busy?: boolean
  onFile: (file: File) => void
  onClear?: () => void
}

export function ImageDropper({
  label,
  hint,
  previewUrl,
  busy,
  onFile,
  onClear,
}: ImageDropperProps) {
  const { inputRef, dragging, dragProps, pick, open } = useFileDrop(onFile)

  const classes = [
    styles.dropper,
    dragging ? styles.dragging : '',
    previewUrl ? styles.hasImage : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...dragProps}>
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={label} className={styles.preview} />
          <div className={styles.overlay}>
            <button type="button" className={styles.smallBtn} onClick={open}>
              Replace
            </button>
            {onClear && (
              <button type="button" className={styles.smallBtn} onClick={onClear}>
                Clear
              </button>
            )}
          </div>
        </>
      ) : (
        <button type="button" className={styles.prompt} onClick={open} disabled={busy}>
          <span className={styles.icon} aria-hidden="true">
            ⊹
          </span>
          <span className={styles.label}>{label}</span>
          <span className={styles.hint}>{hint}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className={styles.input} onChange={pick} />
    </div>
  )
}
