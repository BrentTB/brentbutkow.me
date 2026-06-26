import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import styles from './ImageDropper.module.scss'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = '' // allow re-picking the same file
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) onFile(file)
  }

  const classes = [
    styles.dropper,
    dragging ? styles.dragging : '',
    previewUrl ? styles.hasImage : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={label} className={styles.preview} />
          <div className={styles.overlay}>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={() => inputRef.current?.click()}
            >
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
        <button
          type="button"
          className={styles.prompt}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
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
