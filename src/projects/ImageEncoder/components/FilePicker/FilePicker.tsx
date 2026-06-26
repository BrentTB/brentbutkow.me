import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { formatBytes } from '../../data'
import { SecretFileInfo } from '../../useEncoder'
import styles from './FilePicker.module.scss'

interface FilePickerProps {
  file: SecretFileInfo | null
  onFile: (file: File) => void
}

export function FilePicker({ file, onFile }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0]
    if (chosen) onFile(chosen)
    event.target.value = ''
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) onFile(dropped)
  }

  return (
    <div
      className={`${styles.picker} ${dragging ? styles.dragging : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {file ? (
        <div className={styles.file}>
          {file.previewUrl ? (
            <img src={file.previewUrl} alt={file.name} className={styles.thumb} />
          ) : (
            <span className={styles.icon} aria-hidden="true">
              ▤
            </span>
          )}
          <span className={styles.meta}>
            <span className={styles.name}>{file.name}</span>
            <span className={styles.size}>{formatBytes(file.size)}</span>
          </span>
          <button
            type="button"
            className={styles.replace}
            onClick={() => inputRef.current?.click()}
          >
            Replace
          </button>
        </div>
      ) : (
        <button type="button" className={styles.prompt} onClick={() => inputRef.current?.click()}>
          <span className={styles.promptLabel}>Choose a file to hide</span>
          <span className={styles.promptHint}>Any file. Drag it here, or click</span>
        </button>
      )}
      <input ref={inputRef} type="file" className={styles.input} onChange={pick} />
    </div>
  )
}
