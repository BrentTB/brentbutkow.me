import { useState } from 'react'
import {
  advanceFunnel,
  FunnelAnswer,
  FunnelStep,
  questionsRemaining,
} from '../../engine/unsubscribe-funnel'
import styles from './UnsubscribeFunnel.module.scss'
import { copy } from './data'

type Question = { heading: string; detail: string; leave: string; stay: string }

const questions: Record<string, Question> = {
  [FunnelStep.start]: {
    heading: 'Unsubscribe from the Acme newsletter?',
    detail: 'You are subscribed to 3 mailings.',
    leave: 'Unsubscribe',
    stay: 'Cancel',
  },
  [FunnelStep.guilt]: {
    heading: 'Amara writes this one herself',
    detail: 'She reads every reply. Are you sure you want to stop hearing from her?',
    leave: 'I am sure',
    stay: 'Keep Amara in my inbox',
  },
  [FunnelStep.bargain]: {
    heading: 'How about once a month instead?',
    detail: 'Same newsletter, twelve times a year, none of the product announcements.',
    leave: 'No, unsubscribe',
    stay: 'Switch me to monthly',
  },
  [FunnelStep.survey]: {
    heading: 'Before you go, why are you leaving?',
    detail: 'This is required. There is no skip.',
    leave: 'Too many emails',
    stay: 'I changed my mind',
  },
  [FunnelStep.confirm]: {
    heading: 'Confirm you want to unsubscribe',
    detail: 'This is the last step. It genuinely is, this time.',
    leave: 'Confirm',
    stay: 'Take me back',
  },
}

export function UnsubscribeFunnel() {
  const [step, setStep] = useState<FunnelStep>(FunnelStep.start)
  const question = questions[step]

  if (question === undefined) {
    return (
      <div className={styles.funnel}>
        <p className={styles.outcome}>{step === FunnelStep.gone ? copy.gone : copy.kept}</p>
        <button type="button" className={styles.again} onClick={() => setStep(FunnelStep.start)}>
          {copy.again}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.funnel}>
      <h4 className={styles.heading}>{question.heading}</h4>
      <p className={styles.detail}>{question.detail}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.stay}
          onClick={() => setStep(advanceFunnel(step, FunnelAnswer.stay))}
        >
          {question.stay}
        </button>
        <button
          type="button"
          className={styles.leave}
          onClick={() => setStep(advanceFunnel(step, FunnelAnswer.leave))}
        >
          {question.leave}
        </button>
      </div>

      <p className={styles.readout} aria-live="polite">
        {copy.countdown(questionsRemaining(step))}
      </p>
    </div>
  )
}
