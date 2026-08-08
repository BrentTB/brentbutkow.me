import { useState } from 'react'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './BuriedConsent.module.scss'
import { copy } from './data'

export function BuriedConsent() {
  const [marketing, setMarketing] = useState(true)
  const [contact, setContact] = useState(false)
  const { viaPointer, intentProps } = usePointerIntent()

  // Untick the top one with a mouse and the consent relocates to the box nobody scrolled to.
  const onMarketingChange = (checked: boolean) => {
    setMarketing(checked)
    if (!checked && viaPointer.current) setContact(true)
  }

  const active = Number(marketing) + Number(contact)

  return (
    <div className={styles.terms}>
      <h4 className={styles.heading}>{copy.heading}</h4>

      <div className={styles.scroll} role="region" aria-label={copy.heading}>
        {copy.legalese.map((paragraph) => (
          <p key={paragraph} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}

        {/* Intent lives on the label so a press on the text counts the same as a press on the box. */}
        <label className={styles.check} {...intentProps}>
          <input
            type="checkbox"
            checked={marketing}
            onChange={(event) => onMarketingChange(event.target.checked)}
          />
          <span>{copy.marketing}</span>
        </label>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={contact}
            onChange={(event) => setContact(event.target.checked)}
          />
          <span>{copy.contact}</span>
        </label>
      </div>

      <p className={styles.readout} aria-live="polite">
        {copy.readout(active)}
      </p>
    </div>
  )
}
