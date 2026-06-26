import { PasswordInput } from '../PasswordInput/PasswordInput'
import styles from './KeyField.module.scss'

interface KeyFieldProps {
  enabled: boolean
  value: string
  onToggle: (enabled: boolean) => void
  onChange: (value: string) => void
}

export function KeyField({ enabled, value, onToggle, onChange }: KeyFieldProps) {
  return (
    <div className={styles.keyField}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className={styles.toggleLabel}>Lock with a key</span>
      </label>

      {enabled && <PasswordInput value={value} placeholder="Secret key" onChange={onChange} />}

      <p className={styles.note}>
        {enabled
          ? 'The message is encrypted, so only someone with this key can read it.'
          : 'Off: the message is hidden but not encrypted, so anyone with this tool can read it.'}
      </p>
    </div>
  )
}
