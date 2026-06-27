import styles from './PanelError.module.scss'

interface PanelErrorProps {
  message: string
}

// Shared inline error line for the encode/decode panels, announced to screen
// readers as it appears.
export function PanelError({ message }: PanelErrorProps) {
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  )
}
