import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ContactStatus, useContactForm } from '../useContactForm'
import styles from './ContactForm.module.scss'

export function ContactForm() {
  const { status, submit } = useContactForm()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot

  const sending = status === ContactStatus.sending

  useEffect(() => {
    if (status === ContactStatus.success) {
      setName('')
      setEmail('')
      setMessage('')
    }
  }, [status])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
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
        <button className={styles.submit} type="submit" disabled={sending || !message.trim()}>
          {sending ? 'Sending…' : 'Send message'}
        </button>
        {status === ContactStatus.success && (
          <span className={styles.success}>Thanks — your message was sent.</span>
        )}
        {status === ContactStatus.error && (
          <span className={styles.error}>Something went wrong. Please try again.</span>
        )}
      </div>

      <p className={styles.note}>
        Sends basic technical context (timezone, locale, browser) to help me reply.
      </p>
    </form>
  )
}
