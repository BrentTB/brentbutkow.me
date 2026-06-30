import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ContactStatus, isValidEmail, useContactForm } from '../useContactForm'
import styles from './ContactForm.module.scss'

export function ContactForm() {
  const { status, submit } = useContactForm()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [emailTouched, setEmailTouched] = useState(false)

  const sending = status === ContactStatus.sending
  const emailInvalid = email.trim() !== '' && !isValidEmail(email)
  // Hold the error until the field is left or submit is attempted — don't nag mid-typing.
  const showEmailError = emailInvalid && emailTouched

  useEffect(() => {
    if (status === ContactStatus.success) {
      setName('')
      setEmail('')
      setMessage('')
      setEmailTouched(false)
    }
  }, [status])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (emailInvalid) {
      setEmailTouched(true) // surface the error now that they've tried to send
      return
    }
    void submit({ name, email, message, website })
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h2 className={styles.heading}>Send a message</h2>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>
            Name <span className={styles.optional}>optional</span>
          </span>
          <input
            className={styles.input}
            aria-label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            Email <span className={styles.optional}>optional</span>
          </span>
          <input
            className={styles.input}
            type="email"
            aria-label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setEmailTouched(true)}
            autoComplete="email"
            aria-invalid={showEmailError}
            aria-describedby={showEmailError ? 'email-error' : undefined}
          />
          {showEmailError && (
            <span id="email-error" className={styles.fieldError} role="alert">
              Enter a valid email, or leave it blank.
            </span>
          )}
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Message</span>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          required
        />
      </label>

      {/* Spam trap — off-screen, hidden from humans; bots fill it and get filtered server-side.
          Neutral class name so the generated classname doesn't advertise what it is. */}
      <div className={styles.extraField} aria-hidden="true">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.submit}
          type="submit"
          disabled={sending || !message.trim() || showEmailError}
        >
          {sending ? 'Sending…' : 'Send message'}
        </button>
        {status === ContactStatus.success && (
          <span className={styles.success} role="status">
            Thanks, your message was sent.
          </span>
        )}
        {status === ContactStatus.error && (
          <span className={styles.error} role="alert">
            Something went wrong. Please try again.
          </span>
        )}
      </div>

      <p className={styles.note}>
        Sends basic technical context (timezone, locale, referring page) to help me reply.
      </p>
    </form>
  )
}
