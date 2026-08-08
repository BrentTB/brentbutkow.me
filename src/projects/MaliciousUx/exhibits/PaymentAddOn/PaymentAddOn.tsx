import { useState } from 'react'
import styles from './PaymentAddOn.module.scss'
import { ADD_ON_PRICE, copy, PLAN_PRICE } from './data'

const Step = { choose: 'choose', confirm: 'confirm', paid: 'paid' } as const
type Step = (typeof Step)[keyof typeof Step]

export function PaymentAddOn() {
  const [step, setStep] = useState<Step>(Step.choose)
  // Ticked on arrival at the step where the decision already feels made.
  const [addOn, setAddOn] = useState(true)
  const [charged, setCharged] = useState(PLAN_PRICE)

  const total = PLAN_PRICE + (addOn ? ADD_ON_PRICE : 0)

  const restart = () => {
    setStep(Step.choose)
    setAddOn(true)
    setCharged(PLAN_PRICE)
  }

  return (
    <div className={styles.checkout}>
      {step === Step.choose && (
        <>
          <h4 className={styles.heading}>{copy.chooseHeading}</h4>
          <div className={styles.line}>
            <span>{copy.plan}</span>
            <span className={styles.price}>{copy.planPrice}</span>
          </div>
          <button type="button" className={styles.primary} onClick={() => setStep(Step.confirm)}>
            {copy.continue}
          </button>
        </>
      )}

      {step === Step.confirm && (
        <>
          <h4 className={styles.heading}>{copy.confirmHeading}</h4>
          <p className={styles.card}>{copy.card}</p>

          <div className={styles.line}>
            <span>{copy.lineItem}</span>
            <span className={styles.price}>£{PLAN_PRICE}.00</span>
          </div>

          <label className={styles.addOn}>
            <input
              type="checkbox"
              checked={addOn}
              onChange={(event) => setAddOn(event.target.checked)}
            />
            <span className={styles.addOnText}>{copy.addOn}</span>
            {/* Set in the same grey as the description it trails, at the size of a footnote. */}
            <span className={styles.addOnPrice}>{copy.addOnPrice}</span>
          </label>

          <div className={`${styles.line} ${styles.totalLine}`}>
            <span>{copy.total}</span>
            <span className={styles.price}>£{total}.00</span>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.quiet} onClick={() => setStep(Step.choose)}>
              {copy.back}
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                setCharged(total)
                setStep(Step.paid)
              }}
            >
              {copy.pay}
            </button>
          </div>
        </>
      )}

      {step === Step.paid && (
        <button type="button" className={styles.again} onClick={restart}>
          {copy.again}
        </button>
      )}

      <p className={styles.readout} aria-live="polite">
        {step === Step.choose && copy.quiet}
        {step === Step.confirm && copy.atConfirm}
        {step === Step.paid && copy.paid(charged)}
      </p>
    </div>
  )
}
