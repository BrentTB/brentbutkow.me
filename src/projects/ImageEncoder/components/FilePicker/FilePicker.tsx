import { formatBytes } from '../../data'
import { SecretFileInfo } from '../../useEncoder'
import { useFileDrop } from '../../useFileDrop'
import styles from './FilePicker.module.scss'

interface FilePickerProps {
  file: SecretFileInfo | null
  onFile: (file: File) => void
}

export function FilePicker({ file, onFile }: FilePickerProps) {
  const { inputRef, dragging, dragProps, pick, open } = useFileDrop(onFile)

  return (
    <div className={`${styles.picker} ${dragging ? styles.dragging : ''}`} {...dragProps}>
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
          <button type="button" className={styles.replace} onClick={open}>
            Replace
          </button>
        </div>
      ) : (
        <button type="button" className={styles.prompt} onClick={open}>
          <span className={styles.promptLabel}>Choose a file to hide</span>
          <span className={styles.promptHint}>Any file. Drag it here, or click</span>
        </button>
      )}
      <input ref={inputRef} type="file" className={styles.input} onChange={pick} />
    </div>
  )
}
