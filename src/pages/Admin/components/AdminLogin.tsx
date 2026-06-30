import { FormEvent, useState } from 'react'
import { AdminAuth, AdminAuthStatus } from '../useAdminAuth'
import styles from './AdminLogin.module.scss'

const ERROR_COPY: Partial<Record<AdminAuthStatus, string>> = {
  [AdminAuthStatus.wrongPassword]: 'Wrong password.',
  [AdminAuthStatus.rateLimited]: 'Too many attempts. Wait a minute, then try again.',
  [AdminAuthStatus.error]: 'Could not sign in. Try again.',
}

export function AdminLogin({ auth }: { auth: AdminAuth }) {
  const [password, setPassword] = useState('')
  const authenticating = auth.status === AdminAuthStatus.authenticating
  const error = ERROR_COPY[auth.status]

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password || authenticating) return
    void auth.login(password)
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <span className={styles.eyebrow}>Restricted</span>
      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'admin-login-error' : undefined}
        />
      </label>
      {error && (
        <span id="admin-login-error" className={styles.error} role="alert">
          {error}
        </span>
      )}
      <button className={styles.submit} type="submit" disabled={!password || authenticating}>
        {authenticating ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
