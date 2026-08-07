import { FormEvent, useState } from 'react'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './SelfClearingForm.module.scss'
import { copy } from './data'

const emptyForm = { name: '', email: '', phone: '', reason: '' }

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
/** Nothing but this exact shape will do, and the field will not help you reach it. */
const looksLikePhone = (value: string) => /^\(\d{3}\) \d{3}-\d{4}$/.test(value)

const Field = { email: 'email', phone: 'phone' } as const
type Field = (typeof Field)[keyof typeof Field]

const Status = {
  quiet: 'quiet',
  error: 'error',
  keyboardError: 'keyboardError',
  sent: 'sent',
} as const
type Status = (typeof Status)[keyof typeof Status]

/** The first field the form objects to, or null when it has nothing to complain about. */
function firstComplaint(form: typeof emptyForm): Field | null {
  if (!looksLikeEmail(form.email)) return Field.email
  if (!looksLikePhone(form.phone)) return Field.phone
  return null
}

export function SelfClearingForm() {
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState<Status>(Status.quiet)
  const [rejected, setRejected] = useState<Field | null>(null)
  const { viaPointer, intentProps } = usePointerIntent()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const complaint = firstComplaint(form)
    setRejected(complaint)

    if (complaint === null) {
      setStatus(Status.sent)
      setForm(emptyForm)
      return
    }

    // The punishment for one bad field: a mouse loses the other three, a keyboard keeps them.
    if (viaPointer.current) {
      setForm(emptyForm)
      setStatus(Status.error)
      return
    }
    setStatus(Status.keyboardError)
  }

  const fieldName = rejected === Field.phone ? copy.phoneField : copy.emailField

  const readout = () => {
    if (status === Status.error) return copy.error(fieldName)
    if (status === Status.keyboardError) return copy.keyboardError(fieldName)
    return copy[status]
  }

  const invalid = status === Status.error || status === Status.keyboardError
  const flagged = (field: Field) => invalid && rejected === field

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h4 className={styles.heading}>{copy.heading}</h4>

      <label className={styles.row}>
        <span className={styles.label}>{copy.name}</span>
        <input
          className={styles.input}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </label>

      <label className={styles.row}>
        <span className={styles.label}>{copy.email}</span>
        <input
          className={`${styles.input} ${flagged(Field.email) ? styles.invalid : ''}`}
          type="email"
          value={form.email}
          aria-invalid={flagged(Field.email)}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </label>

      <label className={styles.row}>
        <span className={styles.label}>{copy.phone}</span>
        <input
          className={`${styles.input} ${flagged(Field.phone) ? styles.invalid : ''}`}
          type="tel"
          value={form.phone}
          aria-invalid={flagged(Field.phone)}
          aria-describedby="self-clearing-phone-hint"
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <span className={styles.hint} id="self-clearing-phone-hint">
          {copy.phoneHint}
        </span>
      </label>

      <label className={styles.row}>
        <span className={styles.label}>{copy.reason}</span>
        <input
          className={styles.input}
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
        />
      </label>

      <button type="submit" className={styles.submit} {...intentProps}>
        {copy.submit}
      </button>

      <p className={`${styles.readout} ${invalid ? styles.errorText : ''}`} aria-live="polite">
        {readout()}
      </p>
    </form>
  )
}
