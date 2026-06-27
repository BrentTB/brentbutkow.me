import { ChangeEvent, DragEvent, useRef, useState } from 'react'

// Shared file-picker behaviour for drop zones: a hidden <input>, drag-over
// highlighting, and a click-to-open trigger. Both the cover dropper and the
// secret-file picker compose it, so click and drag stay in sync and the owning
// hook validates the file (no silent drop of an unwanted type).
export function useFileDrop(onFile: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = '' // allow re-picking the same file
  }

  const dragProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      setDragging(true)
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      setDragging(false)
      const file = event.dataTransfer.files?.[0]
      if (file) onFile(file)
    },
  }

  const open = () => inputRef.current?.click()

  return { inputRef, dragging, dragProps, pick, open }
}
